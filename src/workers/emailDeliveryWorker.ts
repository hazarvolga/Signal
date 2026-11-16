import { Worker, type Job, type Queue } from "bullmq";
import type Redis from "ioredis";
import { prisma } from "../services/prisma";
import { serverEmailEngine, type ServerEmailEngine } from "../services/emailServer";
import {
  CAMPAIGN_DELIVERY_QUEUE,
  enqueueRecipientDeliveryBatch,
  getCampaignDeliveryQueue,
  queueCampaignDispatch,
  recipientDeliveryJobId,
  type CampaignDeliveryJob,
} from "../services/email/deliveryQueue";
import { evaluateAndPersistABWinner } from "../services/email/abTesting";
import { instrumentEmailHtml } from "../services/email/tracking";
import { renderReferralWidget } from "../lib/referralToken";
import { logger } from "../services/logger";
import { emailProviderRequestDuration, emailProviderRequestsTotal } from "../services/metrics";

export interface CampaignDeliveryProcessorDependencies {
  emailEngine?: ServerEmailEngine;
  queue?: Queue<CampaignDeliveryJob>;
}

export async function finalizeCampaignDispatch(
  dispatchId: string,
  campaignId: string,
  queue?: Queue<CampaignDeliveryJob>
): Promise<void> {
  const dispatch = await prisma.campaignDispatch.findUnique({
    where: { id: dispatchId },
    select: {
      phase: true,
      organizationId: true,
      startedAt: true,
      campaign: {
        select: { testDuration: true },
      },
    },
  });
  if (!dispatch) throw new Error("Campaign dispatch not found");
  const counts = await prisma.recipientDelivery.groupBy({
    by: ["status"],
    where: { dispatchId },
    _count: { _all: true },
  });
  const count = (status: string) =>
    counts.find((entry) => entry.status === status)?._count._all || 0;
  const pendingCount = count("PENDING") + count("PROCESSING") + count("RETRY");
  const acceptedCount = count("ACCEPTED") + count("DELIVERED");
  const suppressedCount = count("SUPPRESSED");
  const failedCount = count("FAILED") + count("BOUNCED") + count("COMPLAINED") + pendingCount;
  const finalStatus =
    pendingCount > 0
      ? acceptedCount > 0 || suppressedCount > 0
        ? "PARTIAL"
        : "PROCESSING"
      : acceptedCount > 0
        ? failedCount > 0
          ? "PARTIAL"
          : "ACCEPTED"
        : "FAILED";

  await prisma.$transaction([
    prisma.campaignDispatch.update({
      where: { id: dispatchId },
      data: {
        status: finalStatus,
        acceptedCount,
        deliveredCount: count("DELIVERED"),
        failedCount,
        suppressedCount,
        completedAt: pendingCount === 0 ? new Date() : null,
        lastError: pendingCount > 0 ? `${pendingCount} recipient(s) are not final` : null,
      },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data:
        dispatch.phase === "TEST"
          ? {
              status: pendingCount > 0 ? "SENDING" : acceptedCount > 0 ? "TESTING" : "FAILED",
              abTestStatus:
                pendingCount > 0 ? "SENDING_TEST" : acceptedCount > 0 ? "WAITING" : "FAILED",
              abTestStartedAt: dispatch.startedAt || new Date(),
              sentAt: null,
            }
          : {
              status:
                pendingCount > 0
                  ? "SENDING"
                  : acceptedCount > 0
                    ? failedCount > 0
                      ? "PARTIAL"
                      : "SENT"
                    : "FAILED",
              sentAt: pendingCount === 0 && acceptedCount > 0 ? new Date() : null,
            },
    }),
  ]);
  if (queue && dispatch.phase === "TEST" && pendingCount === 0 && acceptedCount > 0) {
    const startedAt = dispatch.startedAt || new Date();
    const dueAt =
      startedAt.getTime() + Math.max(1, dispatch.campaign.testDuration || 4) * 60 * 60 * 1000;
    await queue.add(
      "finalize-ab-test",
      {
        dispatchId,
        campaignId,
        organizationId: dispatch.organizationId,
      },
      {
        jobId: `ab-finalize-${dispatchId}`,
        delay: Math.max(0, dueAt - Date.now()),
        attempts: 5,
        backoff: { type: "exponential", delay: 30_000 },
        removeOnComplete: { age: 7 * 24 * 60 * 60, count: 10_000 },
      }
    );
  }
}

export async function processABTestFinalization(
  dispatchId: string,
  campaignId: string,
  organizationId: string,
  queue: Queue<CampaignDeliveryJob>
): Promise<{ status: string; winnerId?: string; dispatchId?: string }> {
  const testDispatch = await prisma.campaignDispatch.findFirst({
    where: {
      id: dispatchId,
      campaignId,
      organizationId,
      phase: "TEST",
      status: { in: ["ACCEPTED", "PARTIAL"] },
    },
    select: { id: true },
  });
  if (!testDispatch) throw new Error("Completed A/B test dispatch not found");

  const result = await evaluateAndPersistABWinner(campaignId, organizationId);
  if ("reason" in result) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: result.reason === "TEST_WINDOW_OPEN" ? "TESTING" : "FAILED",
        abTestStatus: result.reason === "TEST_WINDOW_OPEN" ? "WAITING" : result.reason,
      },
    });
    if (result.reason === "TEST_WINDOW_OPEN") {
      throw new Error("A/B test window is still open");
    }
    return { status: result.reason };
  }

  const winnerDispatch = await queueCampaignDispatch(
    {
      campaignId,
      organizationId,
      idempotencyKey: `ab-winner:${dispatchId}:${result.winnerId}`,
      phase: "WINNER",
      winnerVariationId: result.winnerId,
    },
    queue
  );
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING", abTestStatus: "WINNER_SENDING" },
  });
  return {
    status: "WINNER_QUEUED",
    winnerId: result.winnerId,
    dispatchId: winnerDispatch.dispatchId,
  };
}

export async function fanOutCampaignDispatch(
  dispatchId: string,
  queue: Queue<CampaignDeliveryJob>
): Promise<{ queuedRecipients: number }> {
  const dispatch = await prisma.campaignDispatch.findUnique({
    where: { id: dispatchId },
    select: {
      id: true,
      campaignId: true,
      status: true,
      fanoutCursor: true,
    },
  });
  if (!dispatch) throw new Error("Campaign dispatch not found");
  if (!["QUEUED", "PROCESSING", "PARTIAL"].includes(dispatch.status)) {
    return { queuedRecipients: 0 };
  }

  await prisma.campaignDispatch.update({
    where: { id: dispatchId },
    data: {
      status: "PROCESSING",
      startedAt: dispatch.status === "QUEUED" ? new Date() : undefined,
    },
  });

  const configuredBatchSize = Number(process.env.EMAIL_QUEUE_BATCH_SIZE || 500);
  const batchSize = Number.isInteger(configuredBatchSize)
    ? Math.min(1_000, Math.max(1, configuredBatchSize))
    : 500;
  let cursorId = dispatch.fanoutCursor || undefined;
  let queuedRecipients = 0;

  while (true) {
    const deliveries = await prisma.recipientDelivery.findMany({
      where: {
        dispatchId,
        status: { in: ["PENDING", "RETRY"] },
        ...(cursorId ? { id: { gt: cursorId } } : {}),
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: batchSize,
    });
    if (deliveries.length === 0) break;

    const jobs = deliveries.map(({ id: deliveryId }) => ({
      name: "deliver-recipient",
      data: { dispatchId, deliveryId },
      opts: {
        jobId: recipientDeliveryJobId(deliveryId),
        attempts: 5,
        backoff: { type: "exponential" as const, delay: 5_000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 100_000 },
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 100_000 },
      },
    }));
    try {
      await enqueueRecipientDeliveryBatch(queue, jobs);
    } catch (error) {
      await prisma.campaignDispatch.update({
        where: { id: dispatchId },
        data: {
          status: "PARTIAL",
          completedAt: null,
          lastError: `Recipient fan-out interrupted after ${queuedRecipients} recipient(s)`,
        },
      });
      throw error;
    }
    queuedRecipients += deliveries.length;
    cursorId = deliveries[deliveries.length - 1].id;
    await prisma.campaignDispatch.update({
      where: { id: dispatchId },
      data: { fanoutCursor: cursorId },
    });
  }

  if (queuedRecipients === 0) {
    await finalizeCampaignDispatch(dispatchId, dispatch.campaignId, queue);
  }
  return { queuedRecipients };
}

export async function processRecipientDelivery(
  deliveryId: string,
  dependencies: CampaignDeliveryProcessorDependencies = {}
): Promise<{ status: "ACCEPTED" | "SUPPRESSED" }> {
  const emailEngine = dependencies.emailEngine || serverEmailEngine;
  const delivery = await prisma.recipientDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      contact: true,
      dispatch: { include: { campaign: true } },
      variation: true,
    },
  });
  if (!delivery) throw new Error("Recipient delivery not found");
  if (["ACCEPTED", "DELIVERED", "BOUNCED", "COMPLAINED", "SUPPRESSED"].includes(delivery.status)) {
    return { status: delivery.status === "SUPPRESSED" ? "SUPPRESSED" : "ACCEPTED" };
  }
  if (delivery.dispatch.campaign.type === "AB" && !delivery.variation) {
    throw new Error("A/B recipient delivery has no persisted variation");
  }

  const claim = await prisma.recipientDelivery.updateMany({
    where: { id: delivery.id, status: { in: ["PENDING", "RETRY", "PROCESSING"] } },
    data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null },
  });
  if (claim.count !== 1) throw new Error("Recipient delivery was already claimed");

  const suppression = await prisma.suppression.findUnique({
    where: {
      organizationId_email: {
        organizationId: delivery.organizationId,
        email: delivery.email.toLowerCase(),
      },
    },
    select: { active: true, reason: true },
  });
  const contactCanReceive =
    delivery.contact.organizationId === delivery.organizationId &&
    delivery.contact.emailConsent &&
    delivery.contact.status === "SUBSCRIBED";
  if (suppression?.active || !contactCanReceive) {
    await prisma.recipientDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SUPPRESSED",
        lastError: suppression?.reason || "CONTACT_NOT_ELIGIBLE",
        failedAt: new Date(),
      },
    });
    await finalizeCampaignDispatch(
      delivery.dispatchId,
      delivery.dispatch.campaignId,
      dependencies.queue
    );
    return { status: "SUPPRESSED" };
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  const preferenceToken = delivery.contact.preferenceToken;
  const unsubscribeHeaders =
    appUrl && preferenceToken
      ? {
          "List-Unsubscribe": `<${appUrl}/api/unsubscribe/${preferenceToken}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined;
  const campaign = delivery.dispatch.campaign;
  const variation = delivery.variation;
  if (!appUrl) {
    throw new Error("APP_URL is required for unsubscribe and engagement tracking");
  }
  const referralHtml = renderReferralWidget({
    html: variation?.content || campaign.content,
    appUrl,
    contactId: delivery.contactId,
    organizationId: delivery.organizationId,
  });
  const trackedHtml = instrumentEmailHtml(referralHtml, appUrl, {
    deliveryId: delivery.id,
    organizationId: delivery.organizationId,
    campaignId: campaign.id,
    variationId: delivery.variationId,
  });
  const providerTimer = emailProviderRequestDuration.startTimer();
  let result;
  try {
    result = await emailEngine.send({
      to: delivery.email,
      subject: variation?.subject || campaign.subject,
      html: trackedHtml,
      fromName: variation?.fromName || campaign.fromName,
      fromEmail: variation?.fromEmail || campaign.fromEmail,
      replyTo: campaign.replyTo || undefined,
      headers: unsubscribeHeaders,
      campaignId: campaign.id,
      contactId: delivery.contactId,
      organizationId: delivery.organizationId,
    });
  } catch (error) {
    emailProviderRequestsTotal.inc({ provider: "UNKNOWN", outcome: "failed" });
    providerTimer({ provider: "UNKNOWN", outcome: "failed" });
    throw error;
  }
  const providerOutcome = result.success ? "accepted" : "failed";
  emailProviderRequestsTotal.inc({ provider: result.provider, outcome: providerOutcome });
  providerTimer({ provider: result.provider, outcome: providerOutcome });
  if (!result.success || !result.messageId) {
    await prisma.recipientDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "RETRY",
        lastError: result.error || "Provider did not return a message ID",
      },
    });
    await finalizeCampaignDispatch(delivery.dispatchId, campaign.id, dependencies.queue);
    throw new Error(result.error || "Provider rejected recipient delivery");
  }

  await prisma.$transaction([
    prisma.recipientDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "ACCEPTED",
        provider: result.provider,
        providerMessageId: result.messageId,
        acceptedAt: new Date(),
        lastError: null,
      },
    }),
    prisma.event.create({
      data: {
        type: "ACCEPTED",
        contactId: delivery.contactId,
        campaignId: campaign.id,
        variationId: delivery.variationId,
        metadata: JSON.stringify({
          dispatchId: delivery.dispatchId,
          recipientDeliveryId: delivery.id,
          provider: result.provider,
          messageId: result.messageId,
        }),
      },
    }),
  ]);
  await finalizeCampaignDispatch(delivery.dispatchId, campaign.id, dependencies.queue);
  return { status: "ACCEPTED" };
}

export function createEmailDeliveryWorker(
  connection: Redis,
  dependencies: CampaignDeliveryProcessorDependencies = {}
): Worker<CampaignDeliveryJob> {
  const concurrency = Math.max(1, Number(process.env.EMAIL_WORKER_CONCURRENCY || 2));
  const rateMax = Math.max(1, Number(process.env.EMAIL_PROVIDER_RATE_MAX || 10));
  const rateDuration = Math.max(
    1_000,
    Number(process.env.EMAIL_PROVIDER_RATE_DURATION_MS || 1_000)
  );
  const producerQueue = dependencies.queue || getCampaignDeliveryQueue();

  const worker = new Worker<CampaignDeliveryJob>(
    CAMPAIGN_DELIVERY_QUEUE,
    async (job: Job<CampaignDeliveryJob>) => {
      if (job.name === "finalize-ab-test") {
        if (!job.data.dispatchId || !job.data.campaignId || !job.data.organizationId) {
          throw new Error("A/B finalization job is incomplete");
        }
        return processABTestFinalization(
          job.data.dispatchId,
          job.data.campaignId,
          job.data.organizationId,
          producerQueue
        );
      }
      if (job.name === "deliver-campaign") {
        if (!job.data.dispatchId) throw new Error("Campaign job is missing dispatchId");
        return fanOutCampaignDispatch(job.data.dispatchId, producerQueue);
      }
      if (!job.data.deliveryId) throw new Error("Recipient delivery job is missing deliveryId");
      return processRecipientDelivery(job.data.deliveryId, {
        ...dependencies,
        queue: producerQueue,
      });
    },
    {
      connection: connection as never,
      concurrency,
      limiter: { max: rateMax, duration: rateDuration },
    }
  );

  worker.on("completed", (job, result) => {
    logger.info(
      { jobId: job.id, dispatchId: job.data.dispatchId, result },
      "Email delivery job completed"
    );
  });
  worker.on("failed", async (job, error) => {
    logger.error(
      { jobId: job?.id, dispatchId: job?.data.dispatchId, err: error },
      "Email delivery attempt failed"
    );
    if (!job || job.attemptsMade < (job.opts.attempts || 1)) return;

    if (job.data.deliveryId) {
      const delivery = await prisma.recipientDelivery.update({
        where: { id: job.data.deliveryId },
        data: { status: "FAILED", failedAt: new Date(), lastError: error.message },
        select: { dispatchId: true, dispatch: { select: { campaignId: true } } },
      });
      await finalizeCampaignDispatch(delivery.dispatchId, delivery.dispatch.campaignId);
    } else if (job.name === "deliver-campaign") {
      await prisma.campaignDispatch.updateMany({
        where: { id: job.data.dispatchId, status: { in: ["QUEUED", "PROCESSING", "PARTIAL"] } },
        data: { status: "PARTIAL", lastError: error.message, completedAt: null },
      });
    } else {
      await prisma.campaignDispatch.updateMany({
        where: { id: job.data.dispatchId, status: { in: ["QUEUED", "PROCESSING", "PARTIAL"] } },
        data: { status: "FAILED", lastError: error.message, completedAt: new Date() },
      });
    }
  });
  return worker;
}
