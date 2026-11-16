import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    integrations: [nodeProfilingIntegration()],
    environment: process.env.NODE_ENV,
    release: process.env.APP_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE || 0.05),
    sendDefaultPii: false,
  });
}
