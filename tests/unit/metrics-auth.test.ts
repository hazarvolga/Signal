import { describe, expect, it } from "vitest";
import { hasValidMetricsCredential } from "../../src/lib/metricsAuth";

describe("metrics authorization", () => {
  const token = "metrics-token-at-least-32-characters";

  it("accepts the legacy header and Prometheus Bearer authorization", () => {
    expect(hasValidMetricsCredential({ "x-metrics-token": token }, token)).toBe(true);
    expect(hasValidMetricsCredential({ authorization: `Bearer ${token}` }, token)).toBe(true);
  });

  it("rejects missing, malformed and incorrect credentials", () => {
    expect(hasValidMetricsCredential({}, token)).toBe(false);
    expect(hasValidMetricsCredential({ authorization: token }, token)).toBe(false);
    expect(hasValidMetricsCredential({ authorization: "Bearer incorrect" }, token)).toBe(false);
    expect(hasValidMetricsCredential({ authorization: `Bearer ${token}` }, undefined)).toBe(false);
  });
});
