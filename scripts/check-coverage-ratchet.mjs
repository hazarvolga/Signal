import { readFile } from "node:fs/promises";

const baselinePath = new URL("../coverage-baseline.json", import.meta.url);
const summaryPath = new URL("../coverage/coverage-summary.json", import.meta.url);

const [baseline, summary] = await Promise.all([
  readFile(baselinePath, "utf8").then(JSON.parse),
  readFile(summaryPath, "utf8").then(JSON.parse),
]);

const failures = [];

for (const [metric, minimum] of Object.entries(baseline.minimum)) {
  const actual = summary.total?.[metric]?.pct;

  if (typeof actual !== "number") {
    failures.push(`${metric}: coverage summary is missing`);
    continue;
  }

  console.log(`${metric}: ${actual}% (minimum ${minimum}%, target ${baseline.target}%)`);

  if (actual < minimum) {
    failures.push(`${metric}: ${actual}% is below ${minimum}%`);
  }
}

if (failures.length > 0) {
  console.error(`Coverage ratchet failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log("Coverage ratchet passed.");
