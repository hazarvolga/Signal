import crypto from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return value?.trim() || null;
}

function timingSafeMatch(candidate: string, expected: string): boolean {
  const supplied = Buffer.from(candidate);
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && crypto.timingSafeEqual(supplied, configured);
}

export function hasValidMetricsCredential(
  headers: IncomingHttpHeaders,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) return false;
  const customToken = headerValue(headers["x-metrics-token"]);
  const authorization = headerValue(headers.authorization);
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
  return Boolean(
    customToken && timingSafeMatch(customToken, expectedToken)
    || bearerToken && timingSafeMatch(bearerToken, expectedToken)
  );
}
