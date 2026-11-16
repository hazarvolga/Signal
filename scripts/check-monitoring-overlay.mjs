import { readFile } from "node:fs/promises";

const [prometheus, compose, rule] = await Promise.all([
  readFile(new URL("../ops/prometheus/prometheus.yml", import.meta.url), "utf8"),
  readFile(new URL("../docker-compose.monitoring.yml", import.meta.url), "utf8"),
  readFile(new URL("../ops/prometheus/referral-verification-alerts.yml", import.meta.url), "utf8"),
]);

const requirements = [
  [prometheus, "credentials_file: /run/secrets/signal_metrics_token"],
  [prometheus, 'targets: ["app:3000"]'],
  [prometheus, 'targets: ["alertmanager:9093"]'],
  [prometheus, "/etc/prometheus/rules/referral-verification-alerts.yml"],
  [compose, "prom/prometheus:v3.13.1"],
  [compose, "prom/alertmanager:v0.33.1"],
  [compose, "METRICS_TOKEN_FILE"],
  [compose, "ALERTMANAGER_CONFIG_PATH"],
  [rule, "SignalReferralVerificationDeliveryExhausted"],
];

for (const [source, fragment] of requirements) {
  if (!source.includes(fragment)) throw new Error(`Monitoring overlay is missing: ${fragment}`);
}
if (/METRICS_TOKEN\s*[:=]\s*[^$\s]/.test(compose)) {
  throw new Error("Monitoring overlay must not embed a metrics token");
}

console.log("Monitoring overlay contract passed");
