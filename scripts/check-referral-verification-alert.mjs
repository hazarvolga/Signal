import { access, readFile } from "node:fs/promises";

const ruleUrl = new URL("../ops/prometheus/referral-verification-alerts.yml", import.meta.url);
const metricUrl = new URL("../src/services/email/referralVerificationMetrics.ts", import.meta.url);
const runbookUrl = new URL("../docs/runbooks/REFERRAL_VERIFICATION.md", import.meta.url);

const [rules, metrics] = await Promise.all([
  readFile(ruleUrl, "utf8"),
  readFile(metricUrl, "utf8"),
  access(runbookUrl),
]);

const requiredFragments = [
  "alert: SignalReferralVerificationDeliveryExhausted",
  "expr: increase(signal_referral_verification_final_failures_total[15m]) > 0",
  "for: 1m",
  "severity: warning",
  "runbook_url: /docs/runbooks/REFERRAL_VERIFICATION.md",
];

for (const fragment of requiredFragments) {
  if (!rules.includes(fragment)) throw new Error(`Referral verification alert is missing: ${fragment}`);
}
if (!metrics.includes('name: "signal_referral_verification_final_failures_total"')) {
  throw new Error("Referral verification alert references an unregistered metric");
}
if (/TODO|CHANGEME|example\.com/i.test(rules)) {
  throw new Error("Referral verification alert contains an unresolved placeholder");
}

console.log("Referral verification alert contract passed");
