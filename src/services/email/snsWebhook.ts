import { createHash, createVerify } from "crypto";
import { prisma } from "../prisma";

interface SnsEnvelope {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: "1" | "2";
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  Token?: string;
  SubscribeURL?: string;
}

interface SesNotification {
  notificationType: "Delivery" | "Bounce" | "Complaint" | "Reject";
  mail: {
    messageId: string;
    timestamp?: string;
  };
  delivery?: { timestamp?: string };
  bounce?: { timestamp?: string; bounceType?: string };
  complaint?: { timestamp?: string };
  reject?: { reason?: string };
}

export interface SnsWebhookDependencies {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  topicArns?: string[];
}

export class InvalidSnsMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSnsMessageError";
  }
}

const certificateCache = new Map<string, string>();

function configuredTopicArns(): string[] {
  return (process.env.SES_SNS_TOPIC_ARNS || "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);
}

function validateSnsHttpsUrl(value: string, requireCertificate: boolean): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InvalidSnsMessageError("Invalid SNS signing certificate URL");
  }
  const validHost =
    /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i.test(url.hostname) ||
    url.hostname === "sns.amazonaws.com";
  if (
    url.protocol !== "https:" ||
    !validHost ||
    url.port ||
    (requireCertificate && !url.pathname.endsWith(".pem"))
  ) {
    throw new InvalidSnsMessageError("Untrusted SNS signing certificate URL");
  }
  return url;
}

function canonicalMessage(envelope: SnsEnvelope): string {
  const fields =
    envelope.Type === "Notification"
      ? ["Message", "MessageId", ...(envelope.Subject ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  const values = envelope as unknown as Record<string, string | undefined>;
  return fields.map((field) => `${field}\n${values[field]}\n`).join("");
}

function validateEnvelopeShape(value: unknown): SnsEnvelope {
  if (!value || typeof value !== "object") {
    throw new InvalidSnsMessageError("SNS payload must be an object");
  }
  const envelope = value as Partial<SnsEnvelope>;
  const required = [
    "Type",
    "MessageId",
    "TopicArn",
    "Message",
    "Timestamp",
    "SignatureVersion",
    "Signature",
    "SigningCertURL",
  ] as const;
  if (required.some((field) => typeof envelope[field] !== "string" || !envelope[field])) {
    throw new InvalidSnsMessageError("SNS payload is missing required fields");
  }
  if (!["Notification", "SubscriptionConfirmation", "UnsubscribeConfirmation"].includes(envelope.Type!)) {
    throw new InvalidSnsMessageError("Unsupported SNS message type");
  }
  if (!["1", "2"].includes(envelope.SignatureVersion!)) {
    throw new InvalidSnsMessageError("Unsupported SNS signature version");
  }
  return envelope as SnsEnvelope;
}

export async function verifySnsEnvelope(
  value: unknown,
  dependencies: SnsWebhookDependencies = {}
): Promise<SnsEnvelope> {
  const envelope = validateEnvelopeShape(value);
  const allowedTopics = dependencies.topicArns || configuredTopicArns();
  if (allowedTopics.length === 0 || !allowedTopics.includes(envelope.TopicArn)) {
    throw new InvalidSnsMessageError("SNS TopicArn is not allowlisted");
  }

  const now = (dependencies.now || (() => new Date()))();
  const timestamp = new Date(envelope.Timestamp);
  if (
    Number.isNaN(timestamp.getTime()) ||
    Math.abs(now.getTime() - timestamp.getTime()) > 5 * 60 * 1000
  ) {
    throw new InvalidSnsMessageError("SNS message timestamp is outside the replay window");
  }

  const certificateUrl = validateSnsHttpsUrl(envelope.SigningCertURL, true);
  let certificate = certificateCache.get(certificateUrl.href);
  if (!certificate) {
    const fetchImpl = dependencies.fetchImpl || globalThis.fetch.bind(globalThis);
    const response = await fetchImpl(certificateUrl);
    if (!response.ok) {
      throw new InvalidSnsMessageError("Unable to retrieve SNS signing certificate");
    }
    certificate = await response.text();
    certificateCache.set(certificateUrl.href, certificate);
  }

  const verifier = createVerify(envelope.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1");
  verifier.update(canonicalMessage(envelope), "utf8");
  verifier.end();
  if (!verifier.verify(certificate, Buffer.from(envelope.Signature, "base64"))) {
    throw new InvalidSnsMessageError("Invalid SNS signature");
  }
  return envelope;
}

function eventStatus(notification: SesNotification): {
  deliveryStatus: string;
  legacyEventType: string;
  suppressionReason?: string;
} {
  switch (notification.notificationType) {
    case "Delivery":
      return { deliveryStatus: "DELIVERED", legacyEventType: "DELIVERED" };
    case "Bounce":
      return {
        deliveryStatus: "BOUNCED",
        legacyEventType: "BOUNCE",
        suppressionReason:
          notification.bounce?.bounceType === "Permanent" ? "HARD_BOUNCE" : undefined,
      };
    case "Complaint":
      return {
        deliveryStatus: "COMPLAINED",
        legacyEventType: "COMPLAINT",
        suppressionReason: "COMPLAINT",
      };
    case "Reject":
      return { deliveryStatus: "FAILED", legacyEventType: "REJECTED" };
  }
}

export async function processSesSnsMessage(
  value: unknown,
  dependencies: SnsWebhookDependencies = {}
): Promise<
  | { kind: "confirmation"; subscribeUrl: string }
  | { kind: "notification"; duplicate: boolean; deliveryId: string; status: string }
> {
  const envelope = await verifySnsEnvelope(value, dependencies);
  if (envelope.Type !== "Notification") {
    if (!envelope.SubscribeURL) {
      throw new InvalidSnsMessageError("SNS confirmation is missing SubscribeURL");
    }
    const subscribeUrl = validateSnsHttpsUrl(envelope.SubscribeURL, false);
    // Keep confirmation explicit: callers may GET this verified, AWS-hosted URL.
    return { kind: "confirmation", subscribeUrl: subscribeUrl.href };
  }

  let notification: SesNotification;
  try {
    notification = JSON.parse(envelope.Message) as SesNotification;
  } catch {
    throw new InvalidSnsMessageError("SNS Message is not valid SES JSON");
  }
  if (!notification.mail?.messageId || !notification.notificationType) {
    throw new InvalidSnsMessageError("SES notification is missing message identity");
  }

  const delivery = await prisma.recipientDelivery.findUnique({
    where: {
      provider_providerMessageId: {
        provider: "AMAZON_SES",
        providerMessageId: notification.mail.messageId,
      },
    },
    include: { dispatch: true },
  });
  if (!delivery) throw new InvalidSnsMessageError("SES message ID is unknown");

  const mapping = eventStatus(notification);
  const payload = JSON.stringify(value);
  const occurredAt = new Date(
    notification.delivery?.timestamp ||
      notification.bounce?.timestamp ||
      notification.complaint?.timestamp ||
      notification.mail.timestamp ||
      envelope.Timestamp
  );

  try {
    await prisma.$transaction(async (tx) => {
      await tx.providerEvent.create({
        data: {
          provider: "AMAZON_SES",
          eventId: envelope.MessageId,
          messageId: notification.mail.messageId,
          type: mapping.deliveryStatus,
          payloadHash: createHash("sha256").update(payload).digest("hex"),
          payload,
          occurredAt,
          organizationId: delivery.organizationId,
          recipientDeliveryId: delivery.id,
        },
      });
      await tx.recipientDelivery.update({
        where: { id: delivery.id },
        data: {
          status: mapping.deliveryStatus,
          deliveredAt: mapping.deliveryStatus === "DELIVERED" ? occurredAt : undefined,
          failedAt: mapping.deliveryStatus !== "DELIVERED" ? occurredAt : undefined,
        },
      });
      await tx.event.create({
        data: {
          type: mapping.legacyEventType,
          contactId: delivery.contactId,
          campaignId: delivery.dispatch.campaignId,
          variationId: delivery.variationId,
          metadata: JSON.stringify({
            provider: "AMAZON_SES",
            providerEventId: envelope.MessageId,
            messageId: notification.mail.messageId,
          }),
          timestamp: occurredAt,
        },
      });
      if (mapping.deliveryStatus === "DELIVERED") {
        await tx.campaignDispatch.update({
          where: { id: delivery.dispatchId },
          data: { deliveredCount: { increment: 1 } },
        });
      } else {
        await tx.campaignDispatch.update({
          where: { id: delivery.dispatchId },
          data: { failedCount: { increment: 1 } },
        });
      }
      if (mapping.suppressionReason) {
        await tx.suppression.upsert({
          where: {
            organizationId_email: {
              organizationId: delivery.organizationId,
              email: delivery.email.toLowerCase(),
            },
          },
          update: {
            active: true,
            reason: mapping.suppressionReason,
            source: "AMAZON_SES",
            providerEventId: envelope.MessageId,
            contactId: delivery.contactId,
          },
          create: {
            organizationId: delivery.organizationId,
            contactId: delivery.contactId,
            email: delivery.email.toLowerCase(),
            reason: mapping.suppressionReason,
            source: "AMAZON_SES",
            providerEventId: envelope.MessageId,
          },
        });
        await tx.contact.updateMany({
          where: { id: delivery.contactId, organizationId: delivery.organizationId },
          data: {
            emailConsent: false,
            status: mapping.deliveryStatus === "BOUNCED" ? "BOUNCED" : "COMPLAINED",
          },
        });
      }
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return {
        kind: "notification",
        duplicate: true,
        deliveryId: delivery.id,
        status: mapping.deliveryStatus,
      };
    }
    throw error;
  }

  return {
    kind: "notification",
    duplicate: false,
    deliveryId: delivery.id,
    status: mapping.deliveryStatus,
  };
}
