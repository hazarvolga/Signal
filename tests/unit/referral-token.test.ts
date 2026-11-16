import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createReferralToken, renderReferralWidget, verifyReferralToken } from "../../src/lib/referralToken";

describe("referral tokens", () => {
  beforeEach(() => vi.stubEnv("REFERRAL_TOKEN_SECRET", "test-referral-secret-with-at-least-32-characters"));
  afterEach(() => vi.unstubAllEnvs());

  it("signs opaque contact attribution and rejects tampering", () => {
    const token = createReferralToken({ contactId: "contact-1", organizationId: "org-1" });
    expect(verifyReferralToken(token)).toMatchObject({ contactId: "contact-1", organizationId: "org-1" });
    expect(verifyReferralToken(`${token}x`)).toBeNull();
    expect(token).not.toContain("@");
  });

  it("replaces every referral widget with a signed public link", () => {
    const html = renderReferralWidget({ html: "A[[REFERRAL_WIDGET]]B", appUrl: "https://signal.example/", contactId: "contact-1", organizationId: "org-1" });
    expect(html).not.toContain("[[REFERRAL_WIDGET]]");
    expect(html).toContain("https://signal.example/referral/");
    expect(html).toContain("Open referral page");
  });
});
