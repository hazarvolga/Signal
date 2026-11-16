import crypto from "node:crypto";

interface ReferralVerificationPayload {
  referralId: string;
  expiresAt: number;
}

const TOKEN_CONTEXT = "signal:referral-verification:v1:";

function signature(encodedPayload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${TOKEN_CONTEXT}${encodedPayload}`).digest("base64url");
}

export function createReferralVerificationToken(
  referralId: string,
  secret: string,
  ttlSeconds = 24 * 60 * 60,
  now = Date.now()
): string {
  if (!referralId.trim()) throw new Error("referralId is required");
  if (secret.length < 32) throw new Error("Referral verification secret must be at least 32 characters");
  const payload: ReferralVerificationPayload = {
    referralId,
    expiresAt: Math.floor(now / 1_000) + ttlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signature(encodedPayload, secret)}`;
}

export function verifyReferralVerificationToken(
  token: string,
  secret: string,
  now = Date.now()
): ReferralVerificationPayload | null {
  if (secret.length < 32) return null;
  const [encodedPayload, suppliedSignature, extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra) return null;

  const expectedSignature = signature(encodedPayload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ReferralVerificationPayload;
    if (!payload.referralId || !Number.isInteger(payload.expiresAt)) return null;
    if (payload.expiresAt < Math.floor(now / 1_000)) return null;
    return payload;
  } catch {
    return null;
  }
}
