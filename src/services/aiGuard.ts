const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
  /\b(?:\d[ -]*?){13,16}\b/g,
];

export function redactPII(text: string): string {
  let result = text;
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, "[REDACTED]");
  }
  return result;
}

const DENYLIST_TERMS = ["hack", "exploit", "bypass security", "dump database"];

export function hasDeniedContent(text: string): boolean {
  const lower = text.toLowerCase();
  return DENYLIST_TERMS.some((term) => lower.includes(term));
}

export interface GuardResult {
  safe: boolean;
  redactedText?: string;
  reason?: string;
}

export function guardInput(text: string): GuardResult {
  if (hasDeniedContent(text)) {
    return { safe: false, reason: "Content contains disallowed terms" };
  }
  const redacted = redactPII(text);
  return { safe: true, redactedText: redacted };
}
