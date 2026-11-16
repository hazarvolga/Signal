import { Queue, type JobsOptions } from "bullmq";
import type Redis from "ioredis";

export const REFERRAL_VERIFICATION_QUEUE = "referral-verification";

export interface ReferralVerificationJob {
  referralId: string;
}

let referralVerificationQueue: Queue<ReferralVerificationJob> | null = null;

export function referralVerificationJobId(referralId: string): string {
  return `referral-verification-${referralId}`;
}

export function initializeReferralVerificationQueue(
  connection: Redis
): Queue<ReferralVerificationJob> {
  if (!referralVerificationQueue) {
    referralVerificationQueue = new Queue<ReferralVerificationJob>(REFERRAL_VERIFICATION_QUEUE, {
      connection: connection as never,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 10_000 },
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 50_000 },
      },
    });
  }
  return referralVerificationQueue;
}

export function getReferralVerificationQueue(): Queue<ReferralVerificationJob> {
  if (!referralVerificationQueue) {
    throw new Error("Referral verification queue is unavailable; REDIS_URL is required");
  }
  return referralVerificationQueue;
}

export async function enqueueReferralVerification(
  referralId: string,
  queue: Queue<ReferralVerificationJob> = getReferralVerificationQueue(),
  options: JobsOptions = {}
): Promise<void> {
  const jobId = referralVerificationJobId(referralId);
  const existing = await queue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (["active", "waiting", "delayed", "prioritized"].includes(state)) return;
    await existing.remove();
  }
  await queue.add("send-referral-verification", { referralId }, { jobId, ...options });
}
