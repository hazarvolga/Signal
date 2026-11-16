import { createHash, createHmac, timingSafeEqual } from "crypto";
import { prisma } from "../prisma";

export type TrackingKind = "OPEN" | "CLICK";

interface TrackingPayload {
  v: 1;
  jti: string;
  kind: TrackingKind;
  deliveryId: string;
  organizationId: string;
  campaignId: string;
  variationId: string | null;
  destination?: string;
  exp: number;
}

export interface TrackingContext {
  deliveryId: string;
  organizationId: string;
  campaignId: string;
  variationId: string | null;
}

export class InvalidTrackingTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTrackingTokenError";
  }
}

function trackingSecret(): string {
  const secret = process.env.EMAIL_TRACKING_SECRET || "";
  if (secret.length < 32) {
    throw new Error("EMAIL_TRACKING_SECRET must contain at least 32 characters");
  }
  return secret;
}

function safeDestination(value: string): string {
  if (value.length > 8_000) throw new InvalidTrackingTokenError("Tracking URL is too long");
  let url: URL;
  try {
    url = new URL(value.replace(/&amp;/gi, "&"));
  } catch {
    throw new InvalidTrackingTokenError("Tracking URL is invalid");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new InvalidTrackingTokenError("Tracking URL protocol is not allowed");
  }
  return url.toString();
}

function encodePayload(payload: TrackingPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signature(encodedPayload: string): string {
  return createHmac("sha256", trackingSecret())
    .update(encodedPayload, "utf8")
    .digest("base64url");
}

export function createTrackingToken(
  kind: TrackingKind,
  context: TrackingContext,
  options: { destination?: string; expiresAt?: Date } = {}
): string {
  const destination =
    kind === "CLICK" && options.destination
      ? safeDestination(options.destination)
      : undefined;
  if (kind === "CLICK" && !destination) {
    throw new InvalidTrackingTokenError("Click tracking requires a destination");
  }
  const configuredTtlDays = Number(process.env.EMAIL_TRACKING_TTL_DAYS || 30);
  const ttlDays =
    Number.isFinite(configuredTtlDays) && configuredTtlDays >= 1
      ? Math.min(365, configuredTtlDays)
      : 30;
  const expirationMs =
    (options.expiresAt?.getTime() ??
      Date.now() +
        ttlDays * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(expirationMs) || expirationMs <= Date.now()) {
    throw new InvalidTrackingTokenError("Tracking token expiry is invalid");
  }
  const exp = Math.floor(expirationMs / 1000);
  const jti = createHash("sha256")
    .update(
      [
        context.deliveryId,
        context.organizationId,
        context.campaignId,
        context.variationId || "",
        kind,
        destination || "",
      ].join(":"),
      "utf8"
    )
    .digest("hex");
  const encoded = encodePayload({
    v: 1,
    jti,
    kind,
    deliveryId: context.deliveryId,
    organizationId: context.organizationId,
    campaignId: context.campaignId,
    variationId: context.variationId,
    destination,
    exp,
  });
  return `${encoded}.${signature(encoded)}`;
}

export function verifyTrackingToken(
  token: string,
  now = new Date()
): TrackingPayload {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) {
    throw new InvalidTrackingTokenError("Tracking token is malformed");
  }
  const expected = Buffer.from(signature(encoded), "base64url");
  const supplied = Buffer.from(suppliedSignature, "base64url");
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    throw new InvalidTrackingTokenError("Tracking token signature is invalid");
  }
  let payload: TrackingPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as TrackingPayload;
  } catch {
    throw new InvalidTrackingTokenError("Tracking token payload is invalid");
  }
  if (
    payload.v !== 1 ||
    !["OPEN", "CLICK"].includes(payload.kind) ||
    !payload.jti ||
    !payload.deliveryId ||
    !payload.organizationId ||
    !payload.campaignId ||
    !Number.isFinite(payload.exp)
  ) {
    throw new InvalidTrackingTokenError("Tracking token payload is incomplete");
  }
  if (payload.exp <= Math.floor(now.getTime() / 1000)) {
    throw new InvalidTrackingTokenError("Tracking token has expired");
  }
  if (payload.kind === "CLICK") {
    payload.destination = safeDestination(payload.destination || "");
  } else if (payload.destination) {
    throw new InvalidTrackingTokenError("Open token cannot contain a destination");
  }
  return payload;
}

export function instrumentEmailHtml(
  html: string,
  appUrl: string,
  context: TrackingContext,
  expiresAt?: Date
): string {
  const baseUrl = new URL(appUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new Error("APP_URL must use HTTP(S) for email tracking");
  }
  const normalizedBase = baseUrl.toString().replace(/\/$/, "");
  const rewritten = html.replace(
    /(<a\b[^>]*?\bhref\s*=\s*)(["'])(.*?)\2/gi,
    (match, prefix: string, quote: string, href: string) => {
      let destination: string;
      try {
        destination = safeDestination(href);
      } catch {
        return match;
      }
      if (
        destination.startsWith(`${normalizedBase}/api/email/track/`) ||
        destination.startsWith(`${normalizedBase}/api/unsubscribe/`) ||
        destination.startsWith(`${normalizedBase}/preferences`)
      ) {
        return match;
      }
      const token = createTrackingToken("CLICK", context, {
        destination,
        expiresAt,
      });
      return `${prefix}${quote}${normalizedBase}/api/email/track/click/${token}${quote}`;
    }
  );
  const openToken = createTrackingToken("OPEN", context, { expiresAt });
  return `${rewritten}<img src="${normalizedBase}/api/email/track/open/${openToken}" width="1" height="1" alt="" style="display:none!important;width:1px;height:1px;border:0" />`;
}

export async function recordTrackingEvent(
  token: string,
  expectedKind: TrackingKind,
  now = new Date()
): Promise<{ duplicate: boolean; destination?: string }> {
  const payload = verifyTrackingToken(token, now);
  if (payload.kind !== expectedKind) {
    throw new InvalidTrackingTokenError("Tracking token kind does not match endpoint");
  }
  const delivery = await prisma.recipientDelivery.findUnique({
    where: { id: payload.deliveryId },
    select: {
      id: true,
      organizationId: true,
      contactId: true,
      variationId: true,
      dispatch: { select: { campaignId: true } },
    },
  });
  if (
    !delivery ||
    delivery.organizationId !== payload.organizationId ||
    delivery.dispatch.campaignId !== payload.campaignId ||
    delivery.variationId !== payload.variationId
  ) {
    throw new InvalidTrackingTokenError("Tracking token context does not match delivery");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.trackingEventReceipt.create({
        data: {
          tokenId: payload.jti,
          kind: payload.kind,
          destination: payload.destination,
          occurredAt: now,
          organizationId: payload.organizationId,
          recipientDeliveryId: delivery.id,
        },
      });
      await tx.event.create({
        data: {
          type: payload.kind,
          contactId: delivery.contactId,
          campaignId: payload.campaignId,
          variationId: payload.variationId,
          timestamp: now,
          metadata: JSON.stringify({
            recipientDeliveryId: delivery.id,
            destination: payload.destination,
          }),
        },
      });
    });
    return { duplicate: false, destination: payload.destination };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { duplicate: true, destination: payload.destination };
    }
    throw error;
  }
}
