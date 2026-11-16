import { Queue } from "bullmq";
import Redis from "ioredis";

export const DATA_REQUEST_QUEUE = "data-requests";

const redisConnection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    })
  : null;

export const dataRequestQueue = redisConnection
  ? new Queue(DATA_REQUEST_QUEUE, { connection: redisConnection })
  : null;

export async function enqueueDataRequest(requestId: string): Promise<void> {
  if (!dataRequestQueue) {
    throw new Error("REDIS_URL is required to process data requests");
  }
  await dataRequestQueue.add(
    "process",
    { requestId },
    {
      jobId: `data-request-${requestId}`,
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000,
    }
  );
}

