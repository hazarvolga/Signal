import crypto from "node:crypto";

interface ReferralTokenPayload {
  v: 1;
  contactId: string;
  organizationId: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.REFERRAL_TOKEN_SECRET || process.env.SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("REFERRAL_TOKEN_SECRET or SESSION_SECRET must be at least 32 characters");
  return secret;
}

function signPayload(encodedPayload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url");
}

export function createReferralToken(input: { contactId: string; organizationId: string; expiresInSeconds?: number }): string {
  const payload: ReferralTokenPayload = {
    v: 1,
    contactId: input.contactId,
    organizationId: input.organizationId,
    exp: Math.floor(Date.now() / 1000) + (input.expiresInSeconds || 31_536_000),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function verifyReferralToken(token: string): ReferralTokenPayload | null {
  const [encodedPayload, suppliedSignature, ...extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra.length) return null;
  const expectedSignature = signPayload(encodedPayload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as ReferralTokenPayload;
    if (payload.v !== 1 || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (!payload.contactId || payload.contactId.length > 128 || !payload.organizationId || payload.organizationId.length > 128) return null;
    return payload;
  } catch {
    return null;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
}

export function renderReferralWidget(input: { html: string; appUrl: string; contactId: string; organizationId: string }): string {
  if (!input.html.includes("[[REFERRAL_WIDGET]]")) return input.html;
  const token = createReferralToken({ contactId: input.contactId, organizationId: input.organizationId });
  const referralUrl = `${input.appUrl.replace(/\/$/, "")}/referral/${encodeURIComponent(token)}`;
  const safeUrl = escapeHtml(referralUrl);
  const widget = `<div style="border:1px solid #d7d1c5;padding:24px;margin:24px 0;text-align:center;background:#faf8f3;color:#171713"><p style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px">Referral Program</p><h2 style="font-size:24px;margin:0 0 10px">Share and earn rewards</h2><p style="font-size:14px;line-height:1.5;margin:0 0 18px">Use your unique referral page to invite someone.</p><a href="${safeUrl}" style="display:inline-block;background:#6f1d2c;color:#fff;text-decoration:none;padding:12px 20px;font-weight:700">Open referral page</a><p style="font-size:11px;line-height:1.4;word-break:break-all;margin:16px 0 0;color:#555">${safeUrl}</p></div>`;
  return input.html.replace(/\[\[REFERRAL_WIDGET\]\]/g, widget);
}
