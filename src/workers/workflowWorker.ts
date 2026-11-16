import { Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import { logger } from "../services/logger";
import { processWorkflowExecution } from "../services/workflow/executor";
import {
  enqueueRecoverableWorkflowExecutions,
  initializeWorkflowQueue,
  WORKFLOW_QUEUE,
} from "../services/workflow/queue";
import type { WorkflowJob } from "../services/workflow/types";

export function createWorkflowWorker(connection: Redis): Worker<WorkflowJob> {
  const queue = initializeWorkflowQueue(connection);
  const worker = new Worker<WorkflowJob>(
    WORKFLOW_QUEUE,
    async (job: Job<WorkflowJob>) => {
      if (!job.data || !["trigger", "continue"].includes(job.data.kind) || !job.data.executionId) {
        throw new Error("Malformed workflow job");
      }
      return processWorkflowExecution(job.data.executionId, { queue });
    },
    {
      connection,
      concurrency: 10,
      lockDuration: 120_000,
      maxStalledCount: 2,
    }
  );
  worker.on("failed", (job, error) => {
    logger.error(
      { err: error, jobId: job?.id, executionId: job?.data.executionId },
      "Workflow execution job failed"
    );
  });
  return worker;
}

/**
 * Single startup integration for server.ts. BullMQ delayed jobs survive process
 * restarts; the recovery scan also recreates a missing job from durable DB state.
 */
export function startWorkflowRuntime(connection: Redis): Worker<WorkflowJob> {
  const worker = createWorkflowWorker(connection);
  worker.on("ready", () => {
    void enqueueRecoverableWorkflowExecutions()
      .then((count) => logger.info({ count }, "Recoverable workflow executions queued"))
      .catch((error) => logger.error({ err: error }, "Workflow recovery scan failed"));
  });
  return worker;
}
