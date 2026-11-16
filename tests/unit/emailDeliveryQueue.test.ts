import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  campaignDispatch: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  campaign: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));

import {
  AudienceRequiredError,
  campaignDeliveryJobId,
  claimScheduledCampaigns,
  createCampaignDispatch,
  enqueueDispatch,
  queueCampaignDispatch,
  UnsupportedCampaignChannelError,
} from "../../src/services/email/deliveryQueue";
import { deterministicBucket } from "../../src/services/email/abTesting";

function admissionQueueFixture() {
  return {
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
  };
}

describe("campaign delivery queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.campaignDispatch.findUnique.mockResolvedValue(null);
  });

  it("uses a deterministic BullMQ job ID", async () => {
    const queue = {
      ...admissionQueueFixture(),
      add: vi.fn().mockResolvedValue({ id: "job" }),
    };

    await enqueueDispatch("dispatch-1", queue as any);

    expect(campaignDeliveryJobId("dispatch-1")).toBe("campaign-dispatch-dispatch-1");
    expect(queue.add).toHaveBeenCalledWith(
      "deliver-campaign",
      { dispatchId: "dispatch-1" },
      { jobId: "campaign-dispatch-dispatch-1" }
    );
  });

  it("returns the existing dispatch for a repeated idempotency key", async () => {
    prismaMock.campaignDispatch.findUnique.mockResolvedValue({
      id: "dispatch-existing",
      organizationId: "org-1",
    });

    await expect(
      createCampaignDispatch({
        campaignId: "campaign-1",
        organizationId: "org-1",
        idempotencyKey: "manual:campaign-1:v1",
      })
    ).resolves.toEqual({ id: "dispatch-existing", created: false });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("fails closed when a campaign has no explicit audience", async () => {
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => unknown) =>
      callback({
        campaign: {
          findFirst: vi.fn().mockResolvedValue({
            id: "campaign-1",
            organizationId: "org-1",
            audiences: [],
          }),
        },
      })
    );

    await expect(
      createCampaignDispatch({
        campaignId: "campaign-1",
        organizationId: "org-1",
        idempotencyKey: "manual:campaign-1:v1",
      })
    ).rejects.toBeInstanceOf(AudienceRequiredError);
  });

  it("never routes a non-email campaign through the email adapter", async () => {
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => unknown) =>
      callback({
        campaign: {
          findFirst: vi.fn().mockResolvedValue({
            id: "campaign-sms",
            organizationId: "org-1",
            type: "REGULAR",
            channel: "SMS",
            testPercentage: null,
            variations: [],
            audiences: [{ contact: { id: "contact-1", email: "one@example.com" } }],
          }),
        },
      })
    );

    await expect(
      createCampaignDispatch({
        campaignId: "campaign-sms",
        organizationId: "org-1",
        idempotencyKey: "sms-must-not-send",
      })
    ).rejects.toBeInstanceOf(UnsupportedCampaignChannelError);
  });

  it("atomically rejects a scheduled campaign without audience and never queues it", async () => {
    prismaMock.campaign.findMany.mockResolvedValue([
      {
        id: "campaign-1",
        organizationId: "org-1",
        scheduledAt: new Date("2026-07-29T12:00:00.000Z"),
      },
    ]);
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => unknown) =>
      callback({
        campaign: {
          findFirst: vi.fn().mockResolvedValue({
            id: "campaign-1",
            organizationId: "org-1",
            audiences: [],
          }),
        },
      })
    );
    prismaMock.campaign.updateMany.mockResolvedValue({ count: 1 });
    const queue = { add: vi.fn() };

    await expect(
      claimScheduledCampaigns(new Date("2026-07-29T12:01:00.000Z"), queue as any)
    ).resolves.toEqual({
      queued: 0,
      rejectedWithoutAudience: 1,
      rejectedInvalidConfiguration: 0,
    });
    expect(prismaMock.campaign.updateMany).toHaveBeenCalledWith({
      where: { id: "campaign-1", status: "SCHEDULED" },
      data: { status: "FAILED" },
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it("claims the expected campaign status and snapshots its explicit audience", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: "dispatch-1" });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => unknown) =>
      callback({
        campaign: {
          findFirst: vi.fn().mockResolvedValue({
            id: "campaign-1",
            organizationId: "org-1",
            type: "REGULAR",
            channel: "EMAIL",
            testPercentage: 20,
            variations: [],
            audiences: [{ contact: { id: "contact-1", email: "One@Example.com" } }],
          }),
          updateMany,
        },
        campaignDispatch: { create },
      })
    );
    const queue = {
      ...admissionQueueFixture(),
      add: vi.fn().mockResolvedValue({}),
    };

    await expect(
      queueCampaignDispatch(
        {
          campaignId: "campaign-1",
          organizationId: "org-1",
          idempotencyKey: "scheduled:campaign-1:2026-07-29T12:00:00.000Z",
          expectedStatus: "SCHEDULED",
        },
        queue as any
      )
    ).resolves.toEqual({ dispatchId: "dispatch-1", created: true });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "campaign-1",
        organizationId: "org-1",
        status: "SCHEDULED",
      },
      data: { status: "QUEUED" },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        totalRecipients: 1,
        deliveries: {
          create: [
            {
              contactId: "contact-1",
              organizationId: "org-1",
              email: "one@example.com",
            },
          ],
        },
      }),
      select: { id: true },
    });
    expect(queue.add).toHaveBeenCalledWith(
      "deliver-campaign",
      { dispatchId: "dispatch-1" },
      { jobId: "campaign-dispatch-dispatch-1" }
    );
  });

  it("creates non-overlapping deterministic TEST and WINNER cohorts", async () => {
    const contacts = Array.from({ length: 40 }, (_, index) => ({
      contact: {
        id: `contact-${index}`,
        email: `contact-${index}@example.com`,
      },
    }));
    expect(
      contacts.some(({ contact }) => deterministicBucket("campaign-ab", contact.id) < 0.25)
    ).toBe(true);
    expect(
      contacts.some(({ contact }) => deterministicBucket("campaign-ab", contact.id) >= 0.25)
    ).toBe(true);
    const creates: any[] = [];
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => unknown) =>
      callback({
        campaign: {
          findFirst: vi.fn().mockResolvedValue({
            id: "campaign-ab",
            organizationId: "org-1",
            type: "AB",
            channel: "EMAIL",
            testPercentage: 25,
            variations: [
              { id: "variation-a", weight: 1 },
              { id: "variation-b", weight: 1 },
            ],
            audiences: contacts,
          }),
          update: vi.fn().mockResolvedValue({}),
        },
        campaignDispatch: {
          create: vi.fn(async (input) => {
            creates.push(input.data);
            return { id: `dispatch-${creates.length}` };
          }),
        },
      })
    );

    await createCampaignDispatch({
      campaignId: "campaign-ab",
      organizationId: "org-1",
      idempotencyKey: "test-phase",
      phase: "TEST",
    });
    await createCampaignDispatch({
      campaignId: "campaign-ab",
      organizationId: "org-1",
      idempotencyKey: "winner-phase",
      phase: "WINNER",
      winnerVariationId: "variation-b",
    });

    const testContacts = new Set(
      creates[0].deliveries.create.map((delivery: any) => delivery.contactId)
    );
    const winnerContacts = new Set(
      creates[1].deliveries.create.map((delivery: any) => delivery.contactId)
    );
    expect([...testContacts].some((id) => winnerContacts.has(id))).toBe(false);
    expect(testContacts.size + winnerContacts.size).toBe(contacts.length);
    expect(
      creates[1].deliveries.create.every((delivery: any) => delivery.variationId === "variation-b")
    ).toBe(true);
  });
});
