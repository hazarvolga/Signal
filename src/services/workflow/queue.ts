import { createHash } from "node:crypto";
import { Queue, type JobsOptions } from "bullmq";
import type Redis from "ioredis";
import { prisma } from "../prisma";
import { findMatchingTrigger, parseAndValidateWorkflowGraph } from "./graph";
import {
  MAX_FLOW_STEPS,
  WORKFLOW_STALE_MS,
  type QueueLike,
  type WorkflowEventInput,
  type WorkflowJob,
} from "./types";

export const WORKFLOW_QUEUE = "workflow-execution";

let workflowQueue: Queue<WorkflowJob> | null = null;

export function initializeWorkflowQueue(connection: Redis): Queue<WorkflowJob> {
  if (!workflowQueue) {
    workflowQueue = new Queue<WorkflowJob>(WORKFLOW_QUEUE, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 25_000 },
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 50_000 },
      },
    });
  }
  return workflowQueue;
}

export function getWorkflowQueue(): Queue<WorkflowJob> {
  if (!workflowQueue) {
    throw new Error("Workflow queue is unavailable; REDIS_URL is required");
  }
  return workflowQueue;
}

export function workflowJobId(kind: WorkflowJob["kind"], executionId: string): string {
  return `workflow-${kind}-${executionId}`;
}

export function workflowContinuationJobId(executionId: string, resumeAt: Date): string {
  return `workflow-continue-${executionId}-${resumeAt.getTime()}`;
}

export async function enqueueWorkflowJob(
  job: WorkflowJob,
  queue: QueueLike = getWorkflowQueue(),
  options: JobsOptions = {}
): Promise<void> {
  await queue.add(job.kind, job, {
    jobId: workflowJobId(job.kind, job.executionId),
    ...options,
  });
}

function executionKey(input: WorkflowEventInput, flowId: string): string {
  return createHash("sha256")
    .update([input.organizationId, flowId, input.contactId, input.eventId].join("\u001f"))
    .digest("hex");
}

/**
 * Durable entry point for all behavioral/domain event integrations.
 *
 * Replaying the same event is safe: `(flowId, contactId, triggerEventId)` and
 * the hashed idempotency key are both unique at the database layer.
 */
export async function enqueueWorkflowEvent(
  input: WorkflowEventInput,
  queue?: QueueLike
): Promise<{ matched: number; queued: number }> {
  if (!input.eventId || !input.organizationId || !input.contactId || !input.eventType) {
    throw new Error("Workflow event requires event, organization, contact and type");
  }

  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, organizationId: input.organizationId },
    select: { id: true },
  });
  if (!contact) throw new Error("Workflow event contact is outside the organization");

  const flows = await prisma.flow.findMany({
    where: { organizationId: input.organizationId, status: "ACTIVE" },
    select: { id: true, nodes: true, edges: true },
    take: 100,
  });

  let matched = 0;
  let queued = 0;
  const pendingExecutionIds: string[] = [];
  for (const flow of flows) {
    const graph = parseAndValidateWorkflowGraph(flow.nodes, flow.edges);
    const trigger = findMatchingTrigger(graph, input.eventType, input.eventName);
    if (!trigger) continue;
    matched += 1;

    const idempotencyKey = executionKey(input, flow.id);
    let execution = await prisma.flowExecution.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true },
    });
    if (!execution) {
      try {
        execution = await prisma.flowExecution.create({
          data: {
            flowId: flow.id,
            organizationId: input.organizationId,
            contactId: input.contactId,
            triggerEventId: input.eventId,
            triggerType: input.eventType,
            triggerName: input.eventName,
            triggerNodeId: trigger.id,
            idempotencyKey,
            currentNodeId: trigger.id,
            maxSteps: MAX_FLOW_STEPS,
            context: JSON.stringify({
              eventType: input.eventType,
              eventName: input.eventName,
              metadata: input.metadata ?? {},
              graph,
            }),
          },
          select: { id: true, status: true },
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "P2002") throw error;
        execution = await prisma.flowExecution.findUniqueOrThrow({
          where: { idempotencyKey },
          select: { id: true, status: true },
        });
      }
    }

    if (["COMPLETED", "FAILED", "CANCELLED"].includes(execution.status)) continue;
    pendingExecutionIds.push(execution.id);
  }

  if (pendingExecutionIds.length === 0) return { matched, queued };
  const targetQueue = queue ?? getWorkflowQueue();
  for (const executionId of pendingExecutionIds) {
    await enqueueWorkflowJob({ kind: "trigger", executionId }, targetQueue);
    queued += 1;
  }
  return { matched, queued };
}

export async function enqueueRecoverableWorkflowExecutions(
  queue: QueueLike = getWorkflowQueue(),
  now = new Date()
): Promise<number> {
  const executions = await prisma.flowExecution.findMany({
    where: {
      OR: [
        { status: { in: ["QUEUED", "RUNNING"] } },
        { status: "WAITING", resumeAt: { not: null } },
      ],
    },
    select: { id: true, status: true, resumeAt: true, startedAt: true },
    take: 1_000,
  });

  for (const execution of executions) {
    const delay =
      execution.status === "WAITING" && execution.resumeAt
        ? Math.max(0, execution.resumeAt.getTime() - now.getTime())
        : execution.status === "RUNNING" && execution.startedAt
          ? Math.max(0, execution.startedAt.getTime() + WORKFLOW_STALE_MS - now.getTime())
          : 0;
    const kind = execution.status === "WAITING" ? "continue" : "trigger";
    await enqueueWorkflowJob(
      {
        kind,
        executionId: execution.id,
      },
      queue,
      {
        delay,
        jobId: `workflow-recovery-${kind}-${execution.id}-${execution.resumeAt?.getTime() ?? execution.startedAt?.getTime() ?? now.getTime()}`,
      }
    );
  }
  return executions.length;
}
