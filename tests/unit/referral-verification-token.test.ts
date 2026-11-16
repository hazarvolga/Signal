import { describe, expect, it } from "vitest";
import {
  createReferralVerificationToken,
  verifyReferralVerificationToken,
} from "../../src/lib/referralVerificationToken";

const SECRET = "referral-verification-test-secret-32-chars";
const NOW = Date.UTC(2026, 7, 20, 12, 0, 0);

describe("referral verification tokens", () => {
  it("round-trips a signed referral id", () => {
    const token = createReferralVerificationToken("referral-123", SECRET, 3_600, NOW);
    expect(verifyReferralVerificationToken(token, SECRET, NOW)).toEqual({
      referralId: "referral-123",
      expiresAt: Math.floor(NOW / 1_000) + 3_600,
    });
  });

  it("rejects tampered and expired tokens", () => {
    const token = createReferralVerificationToken("referral-123", SECRET, 60, NOW);
    expect(verifyReferralVerificationToken(`${token}x`, SECRET, NOW)).toBeNull();
    expect(verifyReferralVerificationToken(token, SECRET, NOW + 61_000)).toBeNull();
  });
});
