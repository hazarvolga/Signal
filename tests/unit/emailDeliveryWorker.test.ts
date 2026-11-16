import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  campaignDispatch: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  recipientDelivery: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    groupBy: vi.fn(),
  },
  suppression: {
    findUnique: vi.fn(),
  },
  event: {
    create: vi.fn(),
  },
  campaign: {
    update: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));
vi.mock("../../src/services/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import {
  fanOutCampaignDispatch,
  processRecipientDelivery,
} from "../../src/workers/emailDeliveryWorker";

function deliveryFixture() {
  return {
    id: "delivery-1",
    dispatchId: "dispatch-1",
    contactId: "contact-1",
    organizationId: "org-1",
    email: "recipient@example.com",
    status: "PENDING",
    variationId: null,
    variation: null,
    contact: {
      id: "contact-1",
      organizationId: "org-1",
      emailConsent: true,
      status: "SUBSCRIBED",
      preferenceToken: "opaque-token",
    },
    dispatch: {
      campaignId: "campaign-1",
      campaign: {
        id: "campaign-1",
        type: "REGULAR",
        subject: "Subject",
        content: "<p>Hello</p>",
        fromName: "Signal",
        fromEmail: "sender@example.com",
        replyTo: null,
      },
    },
  };
}

describe("campaign delivery worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.campaignDispatch.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.campaignDispatch.findUnique.mockResolvedValue({
      phase: "FULL",
      organizationId: "org-1",
      startedAt: new Date("2026-07-29T10:00:00.000Z"),
      campaign: { testDuration: 4 },
    });
    prismaMock.recipientDelivery.findUnique.mockResolvedValue(deliveryFixture());
    prismaMock.recipientDelivery.findMany.mockResolvedValue([]);
    prismaMock.recipientDelivery.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.recipientDelivery.update.mockResolvedValue({});
    prismaMock.event.create.mockResolvedValue({});
    prismaMock.campaignDispatch.update.mockResolvedValue({});
    prismaMock.campaign.update.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (operations: Promise<unknown>[]) =>
      Promise.all(operations)
    );
    vi.stubEnv("APP_URL", "https://signal.example");
    vi.stubEnv("EMAIL_TRACKING_SECRET", "test-only-tracking-secret-with-at-least-32-characters");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fans out deterministic recipient jobs so BullMQ rate limiting applies per email", async () => {
    prismaMock.campaignDispatch.findUnique.mockResolvedValue({
      id: "dispatch-1",
      campaignId: "campaign-1",
      status: "QUEUED",
    });
    prismaMock.recipientDelivery.findMany
      .mockResolvedValueOnce([{ id: "delivery-1" }, { id: "delivery-2" }])
      .mockResolvedValueOnce([]);
    const queue = {
      client: Promise.resolve({
        set: vi.fn().mockResolvedValue("OK"),
        info: vi.fn().mockResolvedValue("used_memory:100\nmaxmemory:1000"),
        eval: vi.fn().mockResolvedValue(1),
      }),
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        delayed: 0,
        prioritized: 0,
      }),
      addBulk: vi.fn().mockResolvedValue([]),
    };

    await expect(fanOutCampaignDispatch("dispatch-1", queue as any)).resolves.toEqual({
      queuedRecipients: 2,
    });
    expect(queue.addBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        name: "deliver-recipient",
        data: { dispatchId: "dispatch-1", deliveryId: "delivery-1" },
        opts: expect.objectContaining({ jobId: "recipient-delivery-delivery-1" }),
      }),
      expect.objectContaining({
        name: "deliver-recipient",
        data: { dispatchId: "dispatch-1", deliveryId: "delivery-2" },
        opts: expect.objectContaining({ jobId: "recipient-delivery-delivery-2" }),
      }),
    ]);
  });

  it("fans out recipient jobs in bounded batches", async () => {
    vi.stubEnv("EMAIL_QUEUE_BATCH_SIZE", "2");
    prismaMock.campaignDispatch.findUnique.mockResolvedValue({
      id: "dispatch-1",
      campaignId: "campaign-1",
      status: "QUEUED",
    });
    prismaMock.recipientDelivery.findMany
      .mockResolvedValueOnce([{ id: "delivery-1" }, { id: "delivery-2" }])
      .mockResolvedValueOnce([{ id: "delivery-3" }, { id: "delivery-4" }])
      .mockResolvedValueOnce([{ id: "delivery-5" }])
      .mockResolvedValueOnce([]);
    const queue = {
      client: Promise.resolve({
        set: vi.fn().mockResolvedValue("OK"),
        info: vi.fn().mockResolvedValue("used_memory:100\nmaxmemory:1000"),
        eval: vi.fn().mockResolvedValue(1),
      }),
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        delayed: 0,
        prioritized: 0,
      }),
      addBulk: vi.fn().mockResolvedValue([]),
    };

    await expect(fanOutCampaignDispatch("dispatch-1", queue as any)).resolves.toEqual({
      queuedRecipients: 5,
    });

    expect(queue.addBulk).toHaveBeenCalledTimes(3);
    expect(queue.addBulk.mock.calls.map(([jobs]) => jobs.length)).toEqual([2, 2, 1]);
  });

  it("persists a recoverable partial state when a later fan-out batch fails", async () => {
    vi.stubEnv("EMAIL_QUEUE_BATCH_SIZE", "2");
    prismaMock.campaignDispatch.findUnique.mockResolvedValue({
      id: "dispatch-1",
      campaignId: "campaign-1",
      status: "QUEUED",
    });
    prismaMock.recipientDelivery.findMany
      .mockResolvedValueOnce([{ id: "delivery-1" }, { id: "delivery-2" }])
      .mockResolvedValueOnce([{ id: "delivery-3" }]);
    const queue = {
      client: Promise.resolve({
        set: vi.fn().mockResolvedValue("OK"),
        info: vi.fn().mockResolvedValue("used_memory:100\nmaxmemory:1000"),
        eval: vi.fn().mockResolvedValue(1),
      }),
      getJobCounts: vi.fn().mockResolvedValue({
        waiting: 0,
        active: 0,
        delayed: 0,
        prioritized: 0,
      }),
      addBulk: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error("Redis capacity exceeded")),
    };

    await expect(fanOutCampaignDispatch("dispatch-1", queue as any)).rejects.toThrow(
      "Redis capacity exceeded"
    );
    expect(prismaMock.campaignDispatch.update).toHaveBeenLastCalledWith({
      where: { id: "dispatch-1" },
      data: expect.objectContaining({
        status: "PARTIAL",
        lastError: "Recipient fan-out interrupted after 2 recipient(s)",
      }),
    });
  });

  it("checks suppression immediately before send and fails closed", async () => {
    prismaMock.suppression.findUnique.mockResolvedValue({
      active: true,
      reason: "COMPLAINT",
    });
    prismaMock.recipientDelivery.groupBy.mockResolvedValue([
      { status: "SUPPRESSED", _count: { _all: 1 } },
    ]);
    const emailEngine = { send: vi.fn() };

    await expect(
      processRecipientDelivery("delivery-1", { emailEngine: emailEngine as any })
    ).resolves.toEqual({ status: "SUPPRESSED" });
    expect(emailEngine.send).not.toHaveBeenCalled();
    expect(prismaMock.recipientDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: expect.objectContaining({
        status: "SUPPRESSED",
        lastError: "COMPLAINT",
      }),
    });
  });

  it("records provider ACCEPTED and injects one-click unsubscribe headers", async () => {
    prismaMock.suppression.findUnique.mockResolvedValue(null);
    prismaMock.recipientDelivery.groupBy.mockResolvedValue([
      { status: "ACCEPTED", _count: { _all: 1 } },
    ]);
    const emailEngine = {
      send: vi.fn().mockResolvedValue({
        success: true,
        status: "ACCEPTED",
        provider: "AMAZON_SES",
        messageId: "provider-message-1",
      }),
    };

    await expect(
      processRecipientDelivery("delivery-1", { emailEngine: emailEngine as any })
    ).resolves.toEqual({ status: "ACCEPTED" });
    expect(emailEngine.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "recipient@example.com",
        headers: {
          "List-Unsubscribe": "<https://signal.example/api/unsubscribe/opaque-token>",
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      })
    );
    expect(prismaMock.recipientDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: expect.objectContaining({
        status: "ACCEPTED",
        provider: "AMAZON_SES",
        providerMessageId: "provider-message-1",
      }),
    });
    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "ACCEPTED" }),
    });
  });

  it("reuses the persisted A/B variation across a provider retry", async () => {
    const abDelivery = {
      ...deliveryFixture(),
      variationId: "variation-b",
      variation: {
        id: "variation-b",
        subject: "Variation B subject",
        content: "<p>Variation B</p>",
        fromName: "Variation Sender",
        fromEmail: "variation@example.com",
      },
      dispatch: {
        campaignId: "campaign-1",
        campaign: {
          ...deliveryFixture().dispatch.campaign,
          type: "AB",
        },
      },
    };
    prismaMock.recipientDelivery.findUnique
      .mockResolvedValueOnce(abDelivery)
      .mockResolvedValueOnce({ ...abDelivery, status: "RETRY" });
    prismaMock.suppression.findUnique.mockResolvedValue(null);
    prismaMock.recipientDelivery.groupBy.mockResolvedValue([
      { status: "RETRY", _count: { _all: 1 } },
    ]);
    const emailEngine = {
      send: vi
        .fn()
        .mockResolvedValueOnce({
          success: false,
          status: "REJECTED",
          provider: "AMAZON_SES",
          error: "temporary provider failure",
        })
        .mockResolvedValueOnce({
          success: true,
          status: "ACCEPTED",
          provider: "AMAZON_SES",
          messageId: "provider-message-2",
        }),
    };

    await expect(
      processRecipientDelivery("delivery-1", { emailEngine: emailEngine as any })
    ).rejects.toThrow("temporary provider failure");
    await expect(
      processRecipientDelivery("delivery-1", { emailEngine: emailEngine as any })
    ).resolves.toEqual({ status: "ACCEPTED" });

    expect(emailEngine.send).toHaveBeenCalledTimes(2);
    for (const call of emailEngine.send.mock.calls) {
      expect(call[0]).toEqual(
        expect.objectContaining({
          subject: "Variation B subject",
          html: expect.stringContaining("<p>Variation B</p>"),
          fromName: "Variation Sender",
          fromEmail: "variation@example.com",
        })
      );
    }
    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "ACCEPTED",
        variationId: "variation-b",
      }),
    });
  });

  it("schedules A/B finalization with one stable delayed job ID across retries", async () => {
    prismaMock.campaignDispatch.findUnique.mockResolvedValue({
      phase: "TEST",
      organizationId: "org-1",
      startedAt: new Date(Date.now() - 60_000),
      campaign: { testDuration: 1 },
    });
    prismaMock.recipientDelivery.groupBy.mockResolvedValue([
      { status: "ACCEPTED", _count: { _all: 3 } },
    ]);
    const queue = { add: vi.fn().mockResolvedValue({}) };
    const { finalizeCampaignDispatch } = await import("../../src/workers/emailDeliveryWorker");

    await finalizeCampaignDispatch("dispatch-test", "campaign-1", queue as any);
    await finalizeCampaignDispatch("dispatch-test", "campaign-1", queue as any);

    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add.mock.calls[0][2]).toEqual(
      expect.objectContaining({ jobId: "ab-finalize-dispatch-test" })
    );
    expect(queue.add.mock.calls[1][2]).toEqual(
      expect.objectContaining({ jobId: "ab-finalize-dispatch-test" })
    );
    expect(prismaMock.campaign.update).toHaveBeenCalledWith({
      where: { id: "campaign-1" },
      data: expect.objectContaining({
        status: "TESTING",
        abTestStatus: "WAITING",
        sentAt: null,
      }),
    });
  });
});
