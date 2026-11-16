import { prisma } from "../prisma";
import { queueCampaignDispatch } from "../email/deliveryQueue";
import { nextNodeId, parseAndValidateWorkflowGraph, waitUntil } from "./graph";
import {
  enqueueWorkflowJob,
  getWorkflowQueue,
  workflowContinuationJobId,
} from "./queue";
import { WORKFLOW_STALE_MS } from "./types";
import type { QueueLike, WorkflowGraph, WorkflowNode } from "./types";

const DEFAULT_NODE_TIMEOUT_MS = 30_000;
const MAX_NODE_TIMEOUT_MS = 120_000;

interface ExecutorDependencies {
  queue?: QueueLike;
  now?: () => Date;
  queueDispatch?: typeof queueCampaignDispatch;
}

interface ExecutionContext {
  eventType?: string;
  eventName?: string;
  metadata?: Record<string, unknown>;
  graph?: WorkflowGraph;
}

function safeParseContext(value: string): ExecutionContext {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function processWorkflowExecution(
  executionId: string,
  dependencies: ExecutorDependencies = {}
): Promise<{ status: string }> {
  const now = dependencies.now ?? (() => new Date());
  const queue = dependencies.queue ?? getWorkflowQueue();
  const queueDispatch = dependencies.queueDispatch ?? queueCampaignDispatch;

  const execution = await prisma.flowExecution.findUnique({
    where: { id: executionId },
    include: {
      flow: { select: { id: true, nodes: true, edges: true, status: true } },
      contact: { select: { id: true, organizationId: true } },
    },
  });
  if (!execution) throw new Error("Workflow execution not found");
  if (["COMPLETED", "FAILED", "CANCELLED"].includes(execution.status)) {
    return { status: execution.status };
  }
  const claimed = await prisma.flowExecution.updateMany({
    where: {
      id: execution.id,
      OR: [
        { status: "QUEUED" },
        { status: "WAITING", resumeAt: { lte: now() } },
        {
          status: "RUNNING",
          startedAt: { lte: new Date(now().getTime() - WORKFLOW_STALE_MS) },
        },
      ],
    },
    data: { status: "RUNNING", startedAt: now() },
  });
  if (claimed.count !== 1) return { status: execution.status };
  if (
    execution.contact.organizationId !== execution.organizationId ||
    execution.flow.status !== "ACTIVE"
  ) {
    await failExecution(execution.id, "Workflow tenant or activation invariant failed", now());
    return { status: "FAILED" };
  }

  const context = safeParseContext(execution.context);
  const graph = context.graph
    ? parseAndValidateWorkflowGraph(context.graph.nodes, context.graph.edges)
    : parseAndValidateWorkflowGraph(execution.flow.nodes, execution.flow.edges);

  await prisma.flowExecution.update({
    where: { id: execution.id },
    data: {
      status: "RUNNING",
      startedAt: now(),
      lastError: null,
    },
  });

  let currentNodeId = execution.currentNodeId ?? execution.triggerNodeId;
  let stepCount = execution.stepCount;
  while (currentNodeId) {
    if (stepCount >= execution.maxSteps) {
      await failExecution(execution.id, "Workflow maximum step count exceeded", now());
      return { status: "FAILED" };
    }
    const node = graph.nodes.find((candidate) => candidate.id === currentNodeId);
    if (!node) {
      await failExecution(execution.id, "Workflow current node no longer exists", now());
      return { status: "FAILED" };
    }

    let nodeRun = await prisma.flowNodeExecution.upsert({
      where: {
        executionId_nodeId: { executionId: execution.id, nodeId: node.id },
      },
      create: {
        executionId: execution.id,
        organizationId: execution.organizationId,
        nodeId: node.id,
        nodeType: `${node.data.type}:${node.data.label}`,
      },
      update: {},
    });

    if (nodeRun.status === "COMPLETED") {
      currentNodeId = nextNodeFromOutput(graph, node, nodeRun.output);
      await updateProgress(execution.id, currentNodeId, stepCount);
      continue;
    }

    if (nodeRun.status === "WAITING" && nodeRun.resumeAt) {
      const delay = nodeRun.resumeAt.getTime() - now().getTime();
      if (delay > 0) {
        await enqueueWorkflowJob(
          { kind: "continue", executionId: execution.id },
          queue,
          {
            delay,
            jobId: workflowContinuationJobId(execution.id, nodeRun.resumeAt),
          }
        );
        return { status: "WAITING" };
      }
      nodeRun = await prisma.flowNodeExecution.update({
        where: { id: nodeRun.id },
        data: { status: "COMPLETED", completedAt: now() },
      });
      stepCount += 1;
      currentNodeId = nextNodeId(graph, node.id);
      await updateProgress(execution.id, currentNodeId, stepCount);
      continue;
    }

    const timeoutMs = Math.min(
      MAX_NODE_TIMEOUT_MS,
      Math.max(1_000, Number(node.data.config?.timeoutMs) || DEFAULT_NODE_TIMEOUT_MS)
    );
    nodeRun = await prisma.flowNodeExecution.update({
      where: { id: nodeRun.id },
      data: {
        status: "RUNNING",
        attempts: { increment: 1 },
        startedAt: now(),
        timeoutAt: new Date(now().getTime() + timeoutMs),
        lastError: null,
      },
    });

    try {
      const result = await withTimeout(
        executeNode(node, graph, execution, nodeRun, queueDispatch, now),
        timeoutMs,
        `Workflow node ${node.id} timed out`
      );
      if (result.waitUntil) {
        await prisma.$transaction([
          prisma.flowNodeExecution.update({
            where: { id: nodeRun.id },
            data: {
              status: "WAITING",
              resumeAt: result.waitUntil,
              output: JSON.stringify({ nextNodeId: result.nextNodeId }),
            },
          }),
          prisma.flowExecution.update({
            where: { id: execution.id },
            data: {
              status: "WAITING",
              currentNodeId: node.id,
              resumeAt: result.waitUntil,
              stepCount,
            },
          }),
        ]);
        await enqueueWorkflowJob({ kind: "continue", executionId: execution.id }, queue, {
          delay: Math.max(0, result.waitUntil.getTime() - now().getTime()),
          jobId: workflowContinuationJobId(execution.id, result.waitUntil),
        });
        return { status: "WAITING" };
      }

      await prisma.flowNodeExecution.update({
        where: { id: nodeRun.id },
        data: {
          status: "COMPLETED",
          output: result.output ? JSON.stringify(result.output) : null,
          completedAt: now(),
          timeoutAt: null,
        },
      });
      stepCount += 1;
      currentNodeId = result.nextNodeId;
      await updateProgress(execution.id, currentNodeId, stepCount);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const terminal = nodeRun.attempts >= nodeRun.maxAttempts;
      await prisma.flowNodeExecution.update({
        where: { id: nodeRun.id },
        data: {
          status: terminal ? "FAILED" : "RETRY",
          lastError: message.slice(0, 2_000),
          completedAt: terminal ? now() : null,
        },
      });
      if (terminal) {
        await failExecution(execution.id, message, now());
        return { status: "FAILED" };
      }
      await prisma.flowExecution.update({
        where: { id: execution.id },
        data: { status: "QUEUED", lastError: message.slice(0, 2_000) },
      });
      throw error;
    }
  }

  await prisma.flowExecution.update({
    where: { id: execution.id },
    data: {
      status: "COMPLETED",
      currentNodeId: null,
      resumeAt: null,
      stepCount,
      completedAt: now(),
    },
  });
  return { status: "COMPLETED" };
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function executeNode(
  node: WorkflowNode,
  graph: WorkflowGraph,
  execution: {
    id: string;
    organizationId: string;
    contactId: string;
  },
  nodeRun: {
    id: string;
    actionCampaignId: string | null;
    campaignDispatchId: string | null;
  },
  queueDispatch: typeof queueCampaignDispatch,
  now: () => Date
): Promise<{
  nextNodeId: string | null;
  waitUntil?: Date;
  output?: Record<string, unknown>;
}> {
  if (node.data.type === "Trigger") {
    return { nextNodeId: nextNodeId(graph, node.id) };
  }
  if (node.data.label === "Wait") {
    const resumeAt = waitUntil(node, now());
    return {
      nextNodeId: nextNodeId(graph, node.id),
      waitUntil: resumeAt,
    };
  }
  if (node.data.label === "If/Else") {
    const branch = await evaluateCondition(node, execution);
    return {
      nextNodeId: nextNodeId(graph, node.id, branch),
      output: { branch },
    };
  }
  if (node.data.label === "Send Email") {
    const dispatchId = await executeSendEmail(node, execution, nodeRun, queueDispatch);
    return {
      nextNodeId: nextNodeId(graph, node.id),
      output: { dispatchId },
    };
  }
  throw new Error(`Unsupported workflow node: ${node.data.label}`);
}

async function evaluateCondition(
  node: WorkflowNode,
  execution: { organizationId: string; contactId: string }
): Promise<boolean> {
  const config = node.data.config ?? {};
  const condition = String(config.conditionType ?? config.condition);
  if (condition === "tag_exists") {
    const tagId = String(config.checkTagId ?? config.tagId ?? "");
    return Boolean(
      await prisma.contact.findFirst({
        where: {
          id: execution.contactId,
          organizationId: execution.organizationId,
          tags: { some: { id: tagId } },
        },
        select: { id: true },
      })
    );
  }
  if (condition === "has_purchased" || condition === "purchase_made") {
    return (
      (await prisma.revenue.count({
        where: {
          contactId: execution.contactId,
          organizationId: execution.organizationId,
        },
      })) > 0
    );
  }
  if (condition === "email_open") {
    const campaignId = typeof config.campaignId === "string" ? config.campaignId : undefined;
    return Boolean(
      await prisma.event.findFirst({
        where: {
          contactId: execution.contactId,
          type: "OPEN",
          ...(campaignId ? { campaignId } : {}),
          contact: { organizationId: execution.organizationId },
        },
        select: { id: true },
      })
    );
  }
  throw new Error("Unsupported workflow condition");
}

async function executeSendEmail(
  node: WorkflowNode,
  execution: { id: string; organizationId: string; contactId: string },
  nodeRun: {
    id: string;
    actionCampaignId: string | null;
    campaignDispatchId: string | null;
  },
  queueDispatch: typeof queueCampaignDispatch
): Promise<string> {
  if (nodeRun.campaignDispatchId) return nodeRun.campaignDispatchId;
  let actionCampaignId = nodeRun.actionCampaignId;

  if (!actionCampaignId) {
    const campaignId = String(node.data.config?.campaignId ?? "");
    const source = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId: execution.organizationId },
      select: {
        name: true,
        subject: true,
        previewText: true,
        fromName: true,
        fromEmail: true,
        replyTo: true,
        content: true,
        channel: true,
        templateId: true,
      },
    });
    if (!source) {
      throw new Error("Send Email campaign is missing or outside the organization");
    }

    const campaign = await prisma.$transaction(async (tx) => {
      const created = await tx.campaign.create({
        data: {
          ...source,
          name: `${source.name} [workflow ${execution.id}]`,
          type: "AUTOMATED",
          status: "DRAFT",
          organizationId: execution.organizationId,
          audiences: { create: { contactId: execution.contactId } },
        },
        select: { id: true },
      });
      await tx.flowNodeExecution.update({
        where: { id: nodeRun.id },
        data: { actionCampaignId: created.id },
      });
      return created;
    });
    actionCampaignId = campaign.id;
  }

  const dispatch = await queueDispatch({
    campaignId: actionCampaignId,
    organizationId: execution.organizationId,
    idempotencyKey: `workflow:${execution.id}:${node.id}`,
  });
  await prisma.flowNodeExecution.update({
    where: { id: nodeRun.id },
    data: { campaignDispatchId: dispatch.dispatchId },
  });
  return dispatch.dispatchId;
}

function nextNodeFromOutput(
  graph: WorkflowGraph,
  node: WorkflowNode,
  output: string | null
): string | null {
  if (node.data.label !== "If/Else") return nextNodeId(graph, node.id);
  try {
    const branch = Boolean(JSON.parse(output ?? "{}").branch);
    return nextNodeId(graph, node.id, branch);
  } catch {
    throw new Error("Workflow condition output is invalid");
  }
}

async function updateProgress(
  executionId: string,
  currentNodeId: string | null,
  stepCount: number
): Promise<void> {
  await prisma.flowExecution.update({
    where: { id: executionId },
    data: {
      status: "RUNNING",
      currentNodeId,
      resumeAt: null,
      stepCount,
    },
  });
}

async function failExecution(executionId: string, error: string, completedAt: Date): Promise<void> {
  await prisma.flowExecution.update({
    where: { id: executionId },
    data: {
      status: "FAILED",
      lastError: error.slice(0, 2_000),
      completedAt,
    },
  });
}
