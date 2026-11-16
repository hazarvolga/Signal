import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API client mutation truthfulness", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects a campaign creation response instead of treating an error body as a campaign", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(jsonResponse(400, { error: "Explicit audience required" }));
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../../src/services/api");

    await expect(api.addCampaign({ name: "Campaign" })).rejects.toThrow(
      "Explicit audience required"
    );
  });

  it("uses a stable manual dispatch idempotency key across client retries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, dispatchId: "dispatch-1" })
      )
      .mockResolvedValueOnce(
        jsonResponse(200, { success: true, dispatchId: "dispatch-1" })
      );
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../../src/services/api");

    await api.dispatchCampaign("campaign-1");
    await api.dispatchCampaign("campaign-1");

    const firstHeaders = new Headers(fetchMock.mock.calls[1][1]?.headers);
    const retryHeaders = new Headers(fetchMock.mock.calls[2][1]?.headers);
    expect(firstHeaders.get("Idempotency-Key")).toBe("manual-ui:campaign-1");
    expect(retryHeaders.get("Idempotency-Key")).toBe("manual-ui:campaign-1");
  });

  it("surfaces workflow activation validation errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(
        jsonResponse(400, { error: "Send Email requires a campaignId" })
      );
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("../../src/services/api");

    await expect(
      api.updateFlow("flow-1", { status: "ACTIVE" })
    ).rejects.toThrow("Send Email requires a campaignId");
  });
});
