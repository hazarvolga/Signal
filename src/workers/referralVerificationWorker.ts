import { Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import { createReferralVerificationToken } from "../lib/referralVerificationToken";
import { serverEmailEngine, type ServerEmailEngine } from "../services/emailServer";
import {
  REFERRAL_VERIFICATION_QUEUE,
  type ReferralVerificationJob,
} from "../services/email/referralVerificationQueue";
import { logger } from "../services/logger";
import { prisma } from "../services/prisma";
import { referralVerificationFinalFailuresTotal } from "../services/email/referralVerificationMetrics";

interface ReferralVerificationWorkerDependencies {
  emailEngine?: ServerEmailEngine;
}

export async function processReferralVerificationEmail(
  referralId: string,
  dependencies: ReferralVerificationWorkerDependencies = {}
) {
  const referral = await prisma.growthReferral.findUnique({ where: { id: referralId } });
  if (!referral || referral.status !== "ATTRIBUTED" || referral.verificationEmailStatus === "ACCEPTED") {
    return { status: "SKIPPED" };
  }

  const verificationSecret = process.env.SESSION_SECRET || "";
  const token = createReferralVerificationToken(referral.id, verificationSecret);
  const verificationUrl = new URL(
    `/referral/verify/${token}`,
    process.env.APP_URL || "http://localhost:3000"
  ).toString();
  const result = await (dependencies.emailEngine || serverEmailEngine).send({
    to: referral.referredEmail,
    subject: "Verify your referral",
    html: `<p>Confirm that you accepted this referral.</p><p><a href="${verificationUrl}">Verify referral</a></p><p>This link expires in 24 hours.</p>`,
    organizationId: referral.organizationId,
  });

  if (!result.success) {
    await prisma.growthReferral.updateMany({
      where: { id: referral.id, status: "ATTRIBUTED" },
      data: {
        verificationEmailStatus: "FAILED",
        verificationEmailAttempts: { increment: 1 },
        verificationEmailLastError: (result.error || "Email provider rejected the request").slice(0, 500),
      },
    });
    throw new Error(result.error || "Referral verification email failed");
  }

  await prisma.growthReferral.updateMany({
    where: { id: referral.id, status: "ATTRIBUTED" },
    data: {
      verificationEmailStatus: "ACCEPTED",
      verificationEmailSentAt: new Date(),
      verificationEmailAttempts: { increment: 1 },
      verificationEmailLastError: null,
    },
  });
  return { status: "ACCEPTED" };
}

export function createReferralVerificationWorker(
  connection: Redis,
  dependencies: ReferralVerificationWorkerDependencies = {}
): Worker<ReferralVerificationJob> {
  const worker = new Worker<ReferralVerificationJob>(
    REFERRAL_VERIFICATION_QUEUE,
    (job: Job<ReferralVerificationJob>) => processReferralVerificationEmail(job.data.referralId, dependencies),
    { connection: connection as never, concurrency: 2, limiter: { max: 10, duration: 1_000 } }
  );
  worker.on("completed", (job, result) => {
    logger.info({ jobId: job.id, referralId: job.data.referralId, result }, "Referral verification email job completed");
  });
  worker.on("failed", (job, error) => {
    logger.error({ jobId: job?.id, referralId: job?.data.referralId, err: error }, "Referral verification email job failed");
    if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
      referralVerificationFinalFailuresTotal.inc();
      logger.error(
        { jobId: job.id, referralId: job.data.referralId, attempts: job.attemptsMade, finalFailure: true },
        "Referral verification email exhausted all delivery attempts"
      );
    }
  });
  return worker;
}
