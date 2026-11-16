import { Queue, type JobsOptions } from "bullmq";
import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { prisma } from "../prisma";
import { queueAdmissionRejectedTotal } from "../metrics";
import {
  deterministicBucket,
  selectDeterministicVariation,
  selectVariationForBucket,
  type WeightedVariation,
} from "./abTesting";

export const CAMPAIGN_DELIVERY_QUEUE = "campaign-delivery";

export interface CampaignDeliveryJob {
  dispatchId?: string;
  deliveryId?: string;
  campaignId?: string;
  organizationId?: string;
}

export class AudienceRequiredError extends Error {
  constructor() {
    super("Campaign has no explicit audience; dispatch is fail-closed");
    this.name = "AudienceRequiredError";
  }
}

export class ABConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ABConfigurationError";
  }
}

export class UnsupportedCampaignChannelError extends Error {
  constructor(channel: string) {
    super(`Email delivery queue cannot dispatch ${channel} campaigns`);
    this.name = "UnsupportedCampaignChannelError";
  }
}

export interface QueueCapacitySnapshot {
  waiting: number;
  active: number;
  delayed: number;
  prioritized: number;
  total: number;
  incoming: number;
  maxWaiting: number;
  maxTotal: number;
}

export class QueueCapacityExceededError extends Error {
  constructor(
    public readonly reason: "waiting" | "total" | "redis_memory" | "concurrent",
    public readonly snapshot?: QueueCapacitySnapshot
  ) {
    super(`Campaign delivery queue capacity exceeded (${reason})`);
    this.name = "QueueCapacityExceededError";
  }
}

function boundedQueueLimit(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100_000, Math.max(100, parsed));
}

export async function assertCampaignQueueCapacity(
  queue: Pick<Queue<CampaignDeliveryJob>, "getJobCounts">,
  incoming = 1
): Promise<QueueCapacitySnapshot> {
  const safeIncoming = Math.min(1_000, Math.max(1, Math.trunc(incoming)));
  const maxWaiting = boundedQueueLimit("EMAIL_QUEUE_MAX_WAITING", 5_000);
  const maxTotal = Math.max(maxWaiting, boundedQueueLimit("EMAIL_QUEUE_MAX_TOTAL", 6_000));
  const counts = await queue.getJobCounts("waiting", "active", "delayed", "prioritized");
  const waiting = counts.waiting || 0;
  const active = counts.active || 0;
  const delayed = counts.delayed || 0;
  const prioritized = counts.prioritized || 0;
  const snapshot: QueueCapacitySnapshot = {
    waiting,
    active,
    delayed,
    prioritized,
    total: waiting + active + delayed + prioritized,
    incoming: safeIncoming,
    maxWaiting,
    maxTotal,
  };
  const reason =
    waiting + safeIncoming > maxWaiting
      ? "waiting"
      : snapshot.total + safeIncoming > maxTotal
        ? "total"
        : null;
  if (reason) {
    queueAdmissionRejectedTotal.inc({
      queue: CAMPAIGN_DELIVERY_QUEUE,
      reason,
    });
    throw new QueueCapacityExceededError(reason, snapshot);
  }
  return snapshot;
}

function redisMemoryUsage(info: string): { used: number; max: number } | null {
  const values = new Map<string, string>();
  for (const rawLine of info.split("\n")) {
    const line = rawLine.trim();
    const separator = line.indexOf(":");
    if (separator > 0) {
      values.set(line.slice(0, separator), line.slice(separator + 1));
    }
  }
  const used = Number(values.get("used_memory"));
  const max = Number(values.get("maxmemory"));
  return Number.isFinite(used) && Number.isFinite(max) && max > 0 ? { used, max } : null;
}

async function withCampaignQueueAdmission<T>(
  queue: Queue<CampaignDeliveryJob>,
  incoming: number,
  operation: () => Promise<T>
): Promise<T> {
  const client = (await queue.client) as unknown as Redis;
  const lockKey = `${CAMPAIGN_DELIVERY_QUEUE}:admission-lock`;
  const lockToken = randomUUID();
  const configuredLockTtl = Number.parseInt(
    process.env.EMAIL_QUEUE_ADMISSION_LOCK_TTL_MS || "30000",
    10
  );
  const lockTtlMs = Number.isFinite(configuredLockTtl)
    ? Math.min(60_000, Math.max(5_000, configuredLockTtl))
    : 30_000;
  const acquired = await client.set(lockKey, lockToken, "PX", lockTtlMs, "NX");
  if (acquired !== "OK") {
    queueAdmissionRejectedTotal.inc({
      queue: CAMPAIGN_DELIVERY_QUEUE,
      reason: "concurrent",
    });
    throw new QueueCapacityExceededError("concurrent");
  }

  try {
    const snapshot = await assertCampaignQueueCapacity(queue, incoming);
    const memory = redisMemoryUsage(await client.info("memory"));
    const configuredMemoryPercent = Number.parseInt(
      process.env.EMAIL_QUEUE_MAX_REDIS_MEMORY_PERCENT || "80",
      10
    );
    const maxMemoryPercent = Number.isFinite(configuredMemoryPercent)
      ? Math.min(95, Math.max(50, configuredMemoryPercent))
      : 80;
    if (memory && (memory.used / memory.max) * 100 >= maxMemoryPercent) {
      queueAdmissionRejectedTotal.inc({
        queue: CAMPAIGN_DELIVERY_QUEUE,
        reason: "redis_memory",
      });
      throw new QueueCapacityExceededError("redis_memory", snapshot);
    }
    return await operation();
  } finally {
    await client.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      lockKey,
      lockToken
    );
  }
}

export async function enqueueRecipientDeliveryBatch(
  queue: Queue<CampaignDeliveryJob>,
  jobs: Parameters<Queue<CampaignDeliveryJob>["addBulk"]>[0]
): Promise<void> {
  if (jobs.length === 0) return;
  await withCampaignQueueAdmission(queue, jobs.length, async () => {
    await queue.addBulk(jobs);
  });
}

let deliveryQueue: Queue<CampaignDeliveryJob> | null = null;

export function campaignDeliveryJobId(dispatchId: string): string {
  return `campaign-dispatch-${dispatchId}`;
}

export function recipientDeliveryJobId(deliveryId: string): string {
  return `recipient-delivery-${deliveryId}`;
}

export function initializeCampaignDeliveryQueue(connection: Redis): Queue<CampaignDeliveryJob> {
  if (!deliveryQueue) {
    deliveryQueue = new Queue<CampaignDeliveryJob>(CAMPAIGN_DELIVERY_QUEUE, {
      connection: connection as never,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { age: 24 * 60 * 60, count: 10_000 },
        removeOnFail: { age: 7 * 24 * 60 * 60, count: 50_000 },
      },
    });
  }
  return deliveryQueue;
}

export function getCampaignDeliveryQueue(): Queue<CampaignDeliveryJob> {
  if (!deliveryQueue) {
    throw new Error("Campaign delivery queue is unavailable; REDIS_URL is required");
  }
  return deliveryQueue;
}

export async function enqueueDispatch(
  dispatchId: string,
  queue: Queue<CampaignDeliveryJob> = getCampaignDeliveryQueue(),
  options: JobsOptions = {}
): Promise<void> {
  await withCampaignQueueAdmission(queue, 1, async () => {
    await queue.add(
      "deliver-campaign",
      { dispatchId },
      {
        jobId: campaignDeliveryJobId(dispatchId),
        ...options,
      }
    );
  });
}

export async function replaceCampaignAudience(
  campaignId: string,
  organizationId: string,
  contactIds: string[]
): Promise<number> {
  const uniqueContactIds = [...new Set(contactIds.filter(Boolean))];
  if (uniqueContactIds.length === 0) throw new AudienceRequiredError();

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findFirst({
      where: { id: campaignId, organizationId },
      select: { id: true },
    });
    if (!campaign) throw new Error("Campaign not found");

    const contacts = await tx.contact.findMany({
      where: {
        id: { in: uniqueContactIds },
        organizationId,
      },
      select: { id: true },
    });
    if (contacts.length !== uniqueContactIds.length) {
      throw new Error("Audience contains unknown or cross-organization contacts");
    }

    await tx.campaignAudience.deleteMany({ where: { campaignId } });
    await tx.campaignAudience.createMany({
      data: contacts.map(({ id: contactId }) => ({ campaignId, contactId })),
    });
    return contacts.length;
  });
}

export interface CreateCampaignDispatchInput {
  campaignId: string;
  organizationId: string;
  idempotencyKey: string;
  requestedById?: string;
  expectedStatus?: string;
  phase?: "FULL" | "TEST" | "WINNER";
  winnerVariationId?: string;
}

export async function createCampaignDispatch(
  input: CreateCampaignDispatchInput
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.campaignDispatch.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { id: true, organizationId: true },
  });
  if (existing) {
    if (existing.organizationId !== input.organizationId) {
      throw new Error("Idempotency key already belongs to another organization");
    }
    return { id: existing.id, created: false };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.findFirst({
        where: {
          id: input.campaignId,
          organizationId: input.organizationId,
          ...(input.expectedStatus ? { status: input.expectedStatus } : {}),
        },
        select: {
          id: true,
          organizationId: true,
          type: true,
          channel: true,
          testPercentage: true,
          variations: {
            select: { id: true, weight: true },
            orderBy: { id: "asc" },
          },
          audiences: {
            select: {
              contact: {
                select: { id: true, email: true },
              },
            },
          },
        },
      });
      if (!campaign) throw new Error("Campaign not found or no longer dispatchable");
      if (campaign.audiences.length === 0) throw new AudienceRequiredError();
      if (campaign.channel !== "EMAIL") {
        throw new UnsupportedCampaignChannelError(campaign.channel);
      }
      const phase = input.phase || (campaign.type === "AB" ? "TEST" : "FULL");
      if (
        (campaign.type === "AB" && phase === "FULL") ||
        (campaign.type !== "AB" && phase !== "FULL")
      ) {
        throw new ABConfigurationError("Campaign type and dispatch phase do not match");
      }
      if (campaign.type === "AB" && campaign.variations.length < 2) {
        throw new ABConfigurationError("A/B campaign requires at least two persisted variations");
      }
      if (campaign.type === "AB") {
        try {
          selectVariationForBucket(0, campaign.variations as WeightedVariation[]);
        } catch {
          throw new ABConfigurationError("A/B campaign variations require positive finite weights");
        }
      }
      const testThreshold = Math.min(0.99, Math.max(0.01, (campaign.testPercentage || 20) / 100));
      const selectedAudience =
        phase === "TEST"
          ? campaign.audiences.filter(
              ({ contact }) => deterministicBucket(campaign.id, contact.id) < testThreshold
            )
          : phase === "WINNER"
            ? campaign.audiences.filter(
                ({ contact }) => deterministicBucket(campaign.id, contact.id) >= testThreshold
              )
            : campaign.audiences;
      if (selectedAudience.length === 0) {
        throw new ABConfigurationError(`${phase} dispatch produced an empty deterministic cohort`);
      }
      const winnerVariation =
        phase === "WINNER"
          ? campaign.variations.find((variation) => variation.id === input.winnerVariationId)
          : undefined;
      if (phase === "WINNER" && !winnerVariation) {
        throw new ABConfigurationError(
          "Winner dispatch requires a variation belonging to the campaign"
        );
      }

      if (input.expectedStatus) {
        const claimed = await tx.campaign.updateMany({
          where: {
            id: campaign.id,
            organizationId: input.organizationId,
            status: input.expectedStatus,
          },
          data: { status: "QUEUED" },
        });
        if (claimed.count !== 1) throw new Error("Campaign was already claimed");
      } else {
        await tx.campaign.update({
          where: { id: campaign.id },
          data: { status: "QUEUED" },
        });
      }

      const dispatch = await tx.campaignDispatch.create({
        data: {
          campaignId: campaign.id,
          organizationId: campaign.organizationId,
          idempotencyKey: input.idempotencyKey,
          requestedById: input.requestedById,
          phase,
          winnerVariationId: winnerVariation?.id,
          totalRecipients: selectedAudience.length,
          deliveries: {
            create: selectedAudience.map(({ contact }) => ({
              contactId: contact.id,
              organizationId: campaign.organizationId,
              email: contact.email.toLowerCase(),
              variationId:
                phase === "WINNER"
                  ? winnerVariation!.id
                  : phase === "TEST"
                    ? selectDeterministicVariation(
                        campaign.id,
                        contact.id,
                        campaign.variations as WeightedVariation[]
                      ).id
                    : undefined,
            })),
          },
        },
        select: { id: true },
      });
      return { id: dispatch.id, created: true };
    });
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    const concurrent = await prisma.campaignDispatch.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: { id: true, organizationId: true },
    });
    if (!concurrent || concurrent.organizationId !== input.organizationId) throw error;
    return { id: concurrent.id, created: false };
  }
}

export async function queueCampaignDispatch(
  input: CreateCampaignDispatchInput,
  queue: Queue<CampaignDeliveryJob> = getCampaignDeliveryQueue()
): Promise<{ dispatchId: string; created: boolean }> {
  const dispatch = await createCampaignDispatch(input);
  await enqueueDispatch(dispatch.id, queue);
  return { dispatchId: dispatch.id, created: dispatch.created };
}

export async function claimScheduledCampaigns(
  now: Date,
  queue: Queue<CampaignDeliveryJob> = getCampaignDeliveryQueue()
): Promise<{
  queued: number;
  rejectedWithoutAudience: number;
  rejectedInvalidConfiguration: number;
}> {
  const campaigns = await prisma.campaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: now } },
    select: {
      id: true,
      organizationId: true,
      scheduledAt: true,
    },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });

  let queued = 0;
  let rejectedWithoutAudience = 0;
  let rejectedInvalidConfiguration = 0;
  for (const campaign of campaigns) {
    const scheduledKey = `scheduled:${campaign.id}:${campaign.scheduledAt!.toISOString()}`;
    try {
      const result = await queueCampaignDispatch(
        {
          campaignId: campaign.id,
          organizationId: campaign.organizationId,
          idempotencyKey: scheduledKey,
          expectedStatus: "SCHEDULED",
        },
        queue
      );
      if (result.created) queued++;
    } catch (error) {
      if (
        error instanceof AudienceRequiredError ||
        error instanceof ABConfigurationError ||
        error instanceof UnsupportedCampaignChannelError
      ) {
        if (error instanceof AudienceRequiredError) rejectedWithoutAudience++;
        else rejectedInvalidConfiguration++;
        await prisma.campaign.updateMany({
          where: { id: campaign.id, status: "SCHEDULED" },
          data: { status: "FAILED" },
        });
        continue;
      }
      throw error;
    }
  }

  return { queued, rejectedWithoutAudience, rejectedInvalidConfiguration };
}

export async function enqueueOrphanedDispatches(
  queue: Queue<CampaignDeliveryJob> = getCampaignDeliveryQueue()
): Promise<number> {
  const queuedDispatches = await prisma.campaignDispatch.findMany({
    where: { status: "QUEUED" },
    select: { id: true },
    take: 500,
  });
  for (const dispatch of queuedDispatches) {
    await enqueueDispatch(dispatch.id, queue);
  }
  return queuedDispatches.length;
}
