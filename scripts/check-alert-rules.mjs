import { readFile } from "node:fs/promises";

const rules = await readFile(new URL("../ops/prometheus/alerts.yml", import.meta.url), "utf8");
const metrics = await readFile(new URL("../src/services/metrics.ts", import.meta.url), "utf8");
const requiredAlerts = [
  "SignalTargetDown",
  "SignalHttp5xxRateHigh",
  "SignalDependencyDown",
  "SignalDatabaseConnectionPressure",
  "SignalRedisMemoryPressure",
  "SignalQueueTelemetryMissing",
  "SignalQueueBacklogHigh",
  "SignalQueueOldestJobHigh",
  "SignalQueueWorkerFailures",
  "SignalEmailProviderFailureRateHigh",
  "SignalEmailProviderLatencyHigh",
  "SignalAiBudgetRejected",
];

for (const alert of requiredAlerts) {
  const block = rules.split(`- alert: ${alert}`)[1]?.split("- alert:")[0] || "";
  if (!block.includes("expr:") || !block.includes("for:") || !block.includes("runbook_url:")) {
    throw new Error(`${alert} must define expr, for and runbook_url`);
  }
}

const referencedMetrics = new Set(rules.match(/signal_[a-z0-9_]+/g) || []);
for (const metric of referencedMetrics) {
  const registeredMetric = metric.replace(/_(?:bucket|sum|count)$/, "");
  if (!metrics.includes(`name: "${registeredMetric}"`)) {
    throw new Error(`Alert rule references an unregistered metric: ${metric}`);
  }
}

if (/TODO|CHANGEME|example\.com/i.test(rules)) {
  throw new Error("Alert rules contain an unresolved placeholder");
}

console.log(
  `Alert contract passed: ${requiredAlerts.length} rules, ${referencedMetrics.size} registered Signal metrics`
);
