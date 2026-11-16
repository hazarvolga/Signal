import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  recipientDelivery: { findUnique: vi.fn() },
  trackingEventReceipt: { create: vi.fn() },
  event: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../../src/services/prisma", () => ({ prisma: prismaMock }));

import {
  createTrackingToken,
  instrumentEmailHtml,
  InvalidTrackingTokenError,
  recordTrackingEvent,
  verifyTrackingToken,
} from "../../src/services/email/tracking";

const context = {
  deliveryId: "delivery-1",
  organizationId: "org-1",
  campaignId: "campaign-1",
  variationId: "variation-a",
};

describe("signed email engagement tracking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv(
      "EMAIL_TRACKING_SECRET",
      "test-only-tracking-secret-with-at-least-32-characters"
    );
    prismaMock.recipientDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
      organizationId: "org-1",
      contactId: "contact-1",
      variationId: "variation-a",
      dispatch: { campaignId: "campaign-1" },
    });
    prismaMock.trackingEventReceipt.create.mockResolvedValue({});
    prismaMock.event.create.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (callback: (tx: any) => unknown) =>
      callback(prismaMock)
    );
  });

  it("binds kind, recipient, tenant, campaign, variation and expiry to the HMAC", () => {
    const token = createTrackingToken("CLICK", context, {
      destination: "https://example.com/offers?a=1",
      expiresAt: new Date("2030-08-01T00:00:00.000Z"),
    });

    expect(
      verifyTrackingToken(token, new Date("2030-07-30T00:00:00.000Z"))
    ).toMatchObject({
      kind: "CLICK",
      deliveryId: "delivery-1",
      organizationId: "org-1",
      campaignId: "campaign-1",
      variationId: "variation-a",
      destination: "https://example.com/offers?a=1",
    });
    const [payload, signature] = token.split(".");
    const tamperedPayload = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}`;
    expect(() =>
      verifyTrackingToken(
        `${tamperedPayload}.${signature}`,
        new Date("2030-07-30T00:00:00.000Z")
      )
    ).toThrow(InvalidTrackingTokenError);
    expect(() =>
      verifyTrackingToken(token, new Date("2030-08-01T00:00:00.000Z"))
    ).toThrow("expired");
  });

  it("rewrites only safe HTTP(S) anchors and appends an open pixel", () => {
    const html = instrumentEmailHtml(
      '<a href="https://example.com/a">safe</a><a href="javascript:alert(1)">unsafe</a>',
      "https://signal.example",
      context,
      new Date("2030-08-01T00:00:00.000Z")
    );

    expect(html).toContain("https://signal.example/api/email/track/click/");
    expect(html).toContain('href="javascript:alert(1)"');
    expect(html).toContain("https://signal.example/api/email/track/open/");
  });

  it("writes one real Event and treats replay as an idempotent duplicate", async () => {
    const token = createTrackingToken("OPEN", context, {
      expiresAt: new Date("2030-08-01T00:00:00.000Z"),
    });

    await expect(
      recordTrackingEvent(token, "OPEN", new Date("2030-07-30T00:00:00.000Z"))
    ).resolves.toEqual({ duplicate: false, destination: undefined });
    prismaMock.trackingEventReceipt.create.mockRejectedValueOnce({ code: "P2002" });
    await expect(
      recordTrackingEvent(token, "OPEN", new Date("2030-07-30T00:01:00.000Z"))
    ).resolves.toEqual({ duplicate: true, destination: undefined });

    expect(prismaMock.event.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "OPEN",
        contactId: "contact-1",
        campaignId: "campaign-1",
        variationId: "variation-a",
      }),
    });
  });

  it("rejects a valid signature when its tenant/delivery context no longer matches", async () => {
    const token = createTrackingToken("OPEN", context, {
      expiresAt: new Date("2030-08-01T00:00:00.000Z"),
    });
    prismaMock.recipientDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
      organizationId: "different-org",
      contactId: "contact-1",
      variationId: "variation-a",
      dispatch: { campaignId: "campaign-1" },
    });

    await expect(
      recordTrackingEvent(token, "OPEN", new Date("2030-07-30T00:00:00.000Z"))
    ).rejects.toThrow("context does not match");
    expect(prismaMock.event.create).not.toHaveBeenCalled();
  });
});
