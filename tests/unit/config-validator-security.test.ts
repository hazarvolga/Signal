import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateConfig } from "../../src/lib/configValidator";

const productionEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://signal:secret@db:5432/signal",
  REDIS_URL: "redis://:secret@redis:6379",
  SESSION_SECRET: "s".repeat(64),
  APP_URL: "https://signal.example.com",
  METRICS_TOKEN: "metrics-secret",
  DATA_EXPORT_ENCRYPTION_KEY: "a".repeat(64),
  CONSENT_TEXT_VERSION: "v1",
  EMAIL_PROVIDER: "AMAZON_SES",
  AWS_REGION: "eu-central-1",
  FROM_EMAIL: "dispatch@example.com",
  SES_SNS_TOPIC_ARNS: "arn:aws:sns:eu-central-1:123456789012:signal-events",
  EMAIL_TRACKING_SECRET: "t".repeat(32),
};

describe("production runtime configuration", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(productionEnv)) vi.stubEnv(key, value);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects an unknown runtime environment instead of falling back to development", () => {
    vi.stubEnv("NODE_ENV", "prodution");

    const result = validateConfig();

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("NODE_ENV must be one of development, test or production");
  });

  it("accepts an explicit production runtime", () => {
    const result = validateConfig();

    expect(result.errors).not.toContain("NODE_ENV must be one of development, test or production");
  });
});
