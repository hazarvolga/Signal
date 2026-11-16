import { beforeEach, describe, expect, it, vi } from "vitest";

const trackingMock = vi.hoisted(() => ({
  recordTrackingEvent: vi.fn(),
  InvalidTrackingTokenError: class InvalidTrackingTokenError extends Error {},
}));

vi.mock("../../src/services/email/tracking", () => trackingMock);
vi.mock("../../src/middleware/auth", () => ({
  requireAuth: (_req: unknown, res: any) =>
    res.status(401).json({ error: "auth should not run for tracking" }),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock("../../src/services/emailServer", () => ({ serverEmailEngine: {} }));
vi.mock("../../src/services/email/deliveryQueue", () => ({
  AudienceRequiredError: class extends Error {},
  ABConfigurationError: class extends Error {},
  UnsupportedCampaignChannelError: class extends Error {},
  queueCampaignDispatch: vi.fn(),
  replaceCampaignAudience: vi.fn(),
}));
vi.mock("../../src/services/prisma", () => ({ prisma: {} }));

import registerEmailRoutes from "../../src/routes/email";

describe("public email tracking routes", () => {
  const router = registerEmailRoutes({} as any) as any;

  function routeHandler(path: string) {
    const layer = router.stack.find(
      (candidate: any) => candidate.route?.path === path
    );
    return layer.route.stack[0].handle;
  }

  function responseMock() {
    const response: any = {
      status: vi.fn(),
      set: vi.fn(),
      send: vi.fn(),
      json: vi.fn(),
      redirect: vi.fn(),
    };
    for (const method of ["status", "set", "send", "json", "redirect"]) {
      response[method].mockReturnValue(response);
    }
    return response;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves a no-cache pixel without entering authenticated email routes", async () => {
    trackingMock.recordTrackingEvent.mockResolvedValue({ duplicate: false });

    const response = responseMock();
    await routeHandler("/api/email/track/open/:token")(
      { params: { token: "signed-token" } },
      response,
      vi.fn()
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.set).toHaveBeenCalledWith(
      expect.objectContaining({
        "Content-Type": "image/gif",
        "Cache-Control": expect.stringContaining("no-store"),
      })
    );
    expect(response.send).toHaveBeenCalledWith(expect.any(Buffer));
    expect(trackingMock.recordTrackingEvent).toHaveBeenCalledWith(
      "signed-token",
      "OPEN"
    );
  });

  it("redirects clicks only to the destination returned by verified tracking", async () => {
    trackingMock.recordTrackingEvent.mockResolvedValue({
      duplicate: false,
      destination: "https://example.com/offer",
    });

    const response = responseMock();
    await routeHandler("/api/email/track/click/:token")(
      { params: { token: "signed-token" } },
      response,
      vi.fn()
    );

    expect(response.status).toHaveBeenCalledWith(302);
    expect(response.set).toHaveBeenCalledWith(
      expect.objectContaining({ "Referrer-Policy": "no-referrer" })
    );
    expect(response.redirect).toHaveBeenCalledWith("https://example.com/offer");
  });
});
