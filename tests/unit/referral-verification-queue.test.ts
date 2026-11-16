import { describe, expect, it } from "vitest";
import { referralVerificationJobId } from "../../src/services/email/referralVerificationQueue";

describe("referral verification queue", () => {
  it("builds a deterministic deduplication id", () => {
    expect(referralVerificationJobId("referral-123")).toBe("referral-verification-referral-123");
  });
});
