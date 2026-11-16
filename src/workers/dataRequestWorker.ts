import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "../services/prisma";
import { DATA_REQUEST_QUEUE } from "../services/compliance/dataRequestQueue";
import { writeEncryptedExport } from "../services/compliance/exportCrypto";
import { logger } from "../services/logger";

type DataRequestJob = { requestId: string };

async function processExport(requestId: string, organizationId: string, contactId: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId },
    include: {
      tags: true,
      segments: true,
      listMemberships: { include: { list: true } },
      events: true,
      behavioralEvents: true,
      revenue: true,
      consentLogs: true,
      engagement: true,
      notifications: true,
      recipientDeliveries: { include: { providerEvents: true } },
      suppressions: true,
    },
  });
  if (!contact) throw new Error("Contact no longer exists");
  const artifactPath = await writeEncryptedExport(requestId, {
    generatedAt: new Date().toISOString(),
    organizationId,
    contact,
  });
  const completedAt = new Date();
  await prisma.dataRequest.update({
    where: { id: requestId },
    data: {
      status: "COMPLETED",
      resultUrl: `/api/compliance/data-requests/${requestId}/download`,
      error: null,
      completedAt,
      expiresAt: new Date(completedAt.getTime() + 7 * 24 * 60 * 60 * 1_000),
    },
  });
  logger.info({ requestId, artifactPath }, "Encrypted data export completed");
}

async function processDelete(requestId: string, organizationId: string, contactId: string) {
  await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true },
    });
    if (!contact) throw new Error("Contact no longer exists");

    await tx.notification.deleteMany({ where: { contactId } });
    await tx.listMembership.deleteMany({ where: { contactId } });
    await tx.event.updateMany({ where: { contactId }, data: { metadata: "{}" } });
    await tx.behavioralEvent.updateMany({ where: { contactId }, data: { properties: "{}" } });
    await tx.engagementEvent.updateMany({ where: { contactId }, data: { metadata: null } });
    await tx.consentLog.updateMany({
      where: { contactId },
      data: { ipAddress: null, userAgent: null },
    });
    await tx.recipientDelivery.updateMany({
      where: { contactId, organizationId },
      data: { email: `deleted-${contactId}@invalid.local` },
    });
    await tx.suppression.updateMany({
      where: { contactId, organizationId },
      data: { email: `deleted-${contactId}@invalid.local`, contactId: null },
    });
    await tx.contact.update({
      where: { id: contactId },
      data: {
        email: `deleted-${contactId}@invalid.local`,
        firstName: null,
        lastName: null,
        phone: null,
        customFields: "{}",
        source: null,
        preferenceToken: null,
        emailConsent: false,
        smsConsent: false,
        whatsappConsent: false,
        status: "DELETED",
        engagementScore: 0,
        tags: { set: [] },
        segments: { set: [] },
      },
    });
    await tx.dataRequest.update({
      where: { id: requestId },
      data: {
        status: "COMPLETED",
        resultUrl: null,
        error: null,
        completedAt: new Date(),
        expiresAt: null,
      },
    });
  });
}

export async function processDataRequest(job: Job<DataRequestJob>): Promise<void> {
  const request = await prisma.dataRequest.findUnique({ where: { id: job.data.requestId } });
  if (!request || request.status === "COMPLETED") return;
  await prisma.dataRequest.update({
    where: { id: request.id },
    data: { status: "PROCESSING", error: null },
  });
  try {
    if (request.type === "EXPORT") {
      await processExport(request.id, request.organizationId, request.contactId);
    } else if (request.type === "DELETE") {
      await processDelete(request.id, request.organizationId, request.contactId);
    } else {
      throw new Error("Unsupported data request type");
    }
  } catch (error) {
    await prisma.dataRequest.update({
      where: { id: request.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message.slice(0, 1_000) : "Unknown worker error",
      },
    });
    throw error;
  }
}

const redisConnection = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    })
  : null;

export const dataRequestWorker = redisConnection
  ? new Worker<DataRequestJob>(DATA_REQUEST_QUEUE, processDataRequest, {
      connection: redisConnection,
      concurrency: 1,
    })
  : null;

dataRequestWorker?.on("failed", (job, error) => {
  logger.error({ requestId: job?.data.requestId, err: error }, "Data request job failed");
});

