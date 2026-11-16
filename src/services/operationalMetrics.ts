import type { Queue } from "bullmq";
import type Redis from "ioredis";
import { prisma } from "./prisma";
import {
  dbConnectionUsageRatio,
  dependencyUp,
  queueJobDuration,
  queueJobs,
  queueOldestWaitingSeconds,
  queueScrapeUp,
  queueWorkerEventsTotal,
  redisMemoryUsageRatio,
} from "./metrics";

const QUEUE_STATES = ["waiting", "active", "delayed", "failed", "prioritized"] as const;

type TelemetryJob = {
  processedOn?: number;
  finishedOn?: number;
};

type WorkerTelemetrySource = {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
};

export function parseRedisMemoryRatio(info: string): number {
  const values = Object.fromEntries(
    info
      .split("\n")
      .map((line) => line.trim().split(":"))
      .filter((parts) => parts.length === 2)
  );
  const usedMemory = Number(values.used_memory || 0);
  const maxMemory = Number(values.maxmemory || 0);
  if (!Number.isFinite(usedMemory) || !Number.isFinite(maxMemory) || maxMemory <= 0) return 0;
  return Math.max(0, usedMemory / maxMemory);
}

function observeJobDuration(queue: string, outcome: string, job: TelemetryJob | undefined): void {
  if (!job?.processedOn) return;
  const finishedOn = job.finishedOn || Date.now();
  queueJobDuration.observe({ queue, outcome }, Math.max(0, finishedOn - job.processedOn) / 1000);
}

export function instrumentQueueWorker(worker: WorkerTelemetrySource | null, queue: string): void {
  if (!worker) return;
  worker.on("completed", (...args: unknown[]) => {
    const job = args[0] as TelemetryJob | undefined;
    queueWorkerEventsTotal.inc({ queue, event: "completed" });
    observeJobDuration(queue, "completed", job);
  });
  worker.on("failed", (...args: unknown[]) => {
    const job = args[0] as TelemetryJob | undefined;
    queueWorkerEventsTotal.inc({ queue, event: "failed" });
    observeJobDuration(queue, "failed", job);
  });
  worker.on("stalled", () => {
    queueWorkerEventsTotal.inc({ queue, event: "stalled" });
  });
}

async function refreshDatabaseMetrics(): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<Array<{ used: number; capacity: number }>>`
      SELECT
        count(*) FILTER (WHERE datname = current_database())::int AS "used",
        current_setting('max_connections')::int AS "capacity"
      FROM pg_stat_activity
    `;
    const used = Number(rows[0]?.used || 0);
    const capacity = Number(rows[0]?.capacity || 0);
    dbConnectionUsageRatio.set(capacity > 0 ? used / capacity : 0);
    dependencyUp.set({ dependency: "postgresql" }, 1);
  } catch {
    dependencyUp.set({ dependency: "postgresql" }, 0);
  }
}

async function refreshRedisMetrics(redis: Redis | null): Promise<void> {
  if (!redis) {
    dependencyUp.set({ dependency: "redis" }, 0);
    redisMemoryUsageRatio.set(0);
    return;
  }
  try {
    await redis.ping();
    redisMemoryUsageRatio.set(parseRedisMemoryRatio(await redis.info("memory")));
    dependencyUp.set({ dependency: "redis" }, 1);
  } catch {
    dependencyUp.set({ dependency: "redis" }, 0);
  }
}

async function refreshQueueMetrics(queue: Queue): Promise<void> {
  try {
    const counts = await queue.getJobCounts(...QUEUE_STATES);
    for (const state of QUEUE_STATES) {
      queueJobs.set({ queue: queue.name, state }, counts[state] || 0);
    }
    const oldest = await queue.getJobs(["waiting", "delayed"], 0, 0, true);
    const ageSeconds = oldest[0]?.timestamp
      ? Math.max(0, (Date.now() - oldest[0].timestamp) / 1000)
      : 0;
    queueOldestWaitingSeconds.set({ queue: queue.name }, ageSeconds);
    queueScrapeUp.set({ queue: queue.name }, 1);
  } catch {
    queueScrapeUp.set({ queue: queue.name }, 0);
  }
}

let refreshInFlight: Promise<void> | null = null;

export function refreshOperationalMetrics(redis: Redis | null, queues: Queue[]): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = Promise.allSettled([
    refreshDatabaseMetrics(),
    refreshRedisMetrics(redis),
    ...queues.map(refreshQueueMetrics),
  ])
    .then(() => undefined)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}
