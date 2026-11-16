import { generateKeyPairSync, createSign } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  recipientDelivery: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  providerEvent: {
    create: vi.fn(),
  },
  event: {
    create: vi.fn(),
  },
  campaignDispatch: {
    update: vi.fn(),
  },
  suppression: {
    upsert: vi.fn(),
  },
  contact: {
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));

import {
  InvalidSnsMessageError,
  processSesSnsMessage,
} from "../../src/services/email/snsWebhook";

const topicArn = "arn:aws:sns:eu-central-1:123456789012:signal-ses-events";

function canonical(envelope: Record<string, string>): string {
  const fields = [
    "Message",
    "MessageId",
    ...(envelope.Subject ? ["Subject"] : []),
    "Timestamp",
    "TopicArn",
    "Type",
  ];
  return fields.map((field) => `${field}\n${envelope[field]}\n`).join("");
}

function signedEnvelope(
  privateKey: string,
  path: string,
  notificationType: "Delivery" | "Bounce" | "Complaint" = "Delivery"
) {
  const timestamp = "2026-07-29T12:00:00.000Z";
  const sesMessage = {
    notificationType,
    mail: { messageId: "ses-message-1", timestamp },
    ...(notificationType === "Delivery"
      ? { delivery: { timestamp } }
      : notificationType === "Bounce"
        ? { bounce: { timestamp, bounceType: "Permanent" } }
        : { complaint: { timestamp } }),
  };
  const envelope: Record<string, string> = {
    Type: "Notification",
    MessageId: `sns-${notificationType.toLowerCase()}-1`,
    TopicArn: topicArn,
    Message: JSON.stringify(sesMessage),
    Timestamp: timestamp,
    SignatureVersion: "2",
    SigningCertURL: `https://sns.eu-central-1.amazonaws.com/${path}.pem`,
    Signature: "",
  };
  envelope.Signature = createSign("RSA-SHA256")
    .update(canonical(envelope), "utf8")
    .end()
    .sign(privateKey)
    .toString("base64");
  return envelope;
}

describe("verified SES SNS webhook processing", () => {
  const keys = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.recipientDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
      dispatchId: "dispatch-1",
      contactId: "contact-1",
      organizationId: "org-1",
      email: "recipient@example.com",
      variationId: "variation-b",
      dispatch: { campaignId: "campaign-1" },
    });
    prismaMock.providerEvent.create.mockResolvedValue({});
    prismaMock.recipientDelivery.update.mockResolvedValue({});
    prismaMock.event.create.mockResolvedValue({});
    prismaMock.campaignDispatch.update.mockResolvedValue({});
    prismaMock.suppression.upsert.mockResolvedValue({});
    prismaMock.contact.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => unknown) =>
      callback(prismaMock)
    );
  });

  it("accepts a valid signed delivery event and updates only its ledger delivery", async () => {
    const envelope = signedEnvelope(keys.privateKey, "delivery-cert", "Delivery");
    const fetchImpl = vi.fn(async () => new Response(keys.publicKey, { status: 200 }));

    await expect(
      processSesSnsMessage(envelope, {
        fetchImpl,
        topicArns: [topicArn],
        now: () => new Date("2026-07-29T12:01:00.000Z"),
      })
    ).resolves.toEqual({
      kind: "notification",
      duplicate: false,
      deliveryId: "delivery-1",
      status: "DELIVERED",
    });
    expect(prismaMock.recipientDelivery.findUnique).toHaveBeenCalledWith({
      where: {
        provider_providerMessageId: {
          provider: "AMAZON_SES",
          providerMessageId: "ses-message-1",
        },
      },
      include: { dispatch: true },
    });
    expect(prismaMock.providerEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "AMAZON_SES",
        eventId: "sns-delivery-1",
        type: "DELIVERED",
        organizationId: "org-1",
        recipientDeliveryId: "delivery-1",
      }),
    });
    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "DELIVERED",
        variationId: "variation-b",
      }),
    });
    expect(prismaMock.suppression.upsert).not.toHaveBeenCalled();
  });

  it("creates a tenant-scoped suppression after a verified hard bounce", async () => {
    const envelope = signedEnvelope(keys.privateKey, "bounce-cert", "Bounce");

    await expect(
      processSesSnsMessage(envelope, {
        fetchImpl: vi.fn(async () => new Response(keys.publicKey, { status: 200 })),
        topicArns: [topicArn],
        now: () => new Date("2026-07-29T12:01:00.000Z"),
      })
    ).resolves.toMatchObject({ status: "BOUNCED", duplicate: false });
    expect(prismaMock.suppression.upsert).toHaveBeenCalledWith({
      where: {
        organizationId_email: {
          organizationId: "org-1",
          email: "recipient@example.com",
        },
      },
      update: expect.objectContaining({
        reason: "HARD_BOUNCE",
        source: "AMAZON_SES",
        contactId: "contact-1",
      }),
      create: expect.objectContaining({
        organizationId: "org-1",
        email: "recipient@example.com",
        reason: "HARD_BOUNCE",
      }),
    });
    expect(prismaMock.contact.updateMany).toHaveBeenCalledWith({
      where: { id: "contact-1", organizationId: "org-1" },
      data: { emailConsent: false, status: "BOUNCED" },
    });
  });

  it("rejects a spoofed signature before any database lookup", async () => {
    const envelope = signedEnvelope(keys.privateKey, "spoof-cert");
    envelope.Signature = Buffer.from("spoofed").toString("base64");

    await expect(
      processSesSnsMessage(envelope, {
        fetchImpl: vi.fn(async () => new Response(keys.publicKey, { status: 200 })),
        topicArns: [topicArn],
        now: () => new Date("2026-07-29T12:01:00.000Z"),
      })
    ).rejects.toBeInstanceOf(InvalidSnsMessageError);
    expect(prismaMock.recipientDelivery.findUnique).not.toHaveBeenCalled();
  });

  it("rejects non-allowlisted topics and stale replayed messages", async () => {
    const envelope = signedEnvelope(keys.privateKey, "replay-cert");
    const fetchImpl = vi.fn();

    await expect(
      processSesSnsMessage(envelope, {
        fetchImpl,
        topicArns: ["arn:aws:sns:eu-central-1:123456789012:other"],
        now: () => new Date("2026-07-29T12:01:00.000Z"),
      })
    ).rejects.toThrow("TopicArn is not allowlisted");

    await expect(
      processSesSnsMessage(envelope, {
        fetchImpl,
        topicArns: [topicArn],
        now: () => new Date("2026-07-29T13:00:00.000Z"),
      })
    ).rejects.toThrow("outside the replay window");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("treats a repeated SNS MessageId as an idempotent duplicate", async () => {
    const envelope = signedEnvelope(keys.privateKey, "duplicate-cert");
    prismaMock.providerEvent.create.mockRejectedValue({ code: "P2002" });

    await expect(
      processSesSnsMessage(envelope, {
        fetchImpl: vi.fn(async () => new Response(keys.publicKey, { status: 200 })),
        topicArns: [topicArn],
        now: () => new Date("2026-07-29T12:01:00.000Z"),
      })
    ).resolves.toEqual({
      kind: "notification",
      duplicate: true,
      deliveryId: "delivery-1",
      status: "DELIVERED",
    });
  });
});
