import client from "prom-client";

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["query"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

export const queueAdmissionRejectedTotal = new client.Counter({
  name: "queue_admission_rejected_total",
  help: "Queue admission attempts rejected by the configured high-watermark",
  labelNames: ["queue", "reason"],
  registers: [register],
});

export const dependencyUp = new client.Gauge({
  name: "signal_dependency_up",
  help: "Whether a required Signal dependency is reachable (1) or unavailable (0)",
  labelNames: ["dependency"],
  registers: [register],
});

export const dbConnectionUsageRatio = new client.Gauge({
  name: "signal_db_connection_usage_ratio",
  help: "Current PostgreSQL connections for this database divided by max_connections",
  registers: [register],
});

export const redisMemoryUsageRatio = new client.Gauge({
  name: "signal_redis_memory_usage_ratio",
  help: "Redis used_memory divided by maxmemory; zero when maxmemory is not configured",
  registers: [register],
});

export const queueJobs = new client.Gauge({
  name: "signal_queue_jobs",
  help: "Current BullMQ jobs by queue and state",
  labelNames: ["queue", "state"],
  registers: [register],
});

export const queueOldestWaitingSeconds = new client.Gauge({
  name: "signal_queue_oldest_waiting_seconds",
  help: "Age in seconds of the oldest waiting or delayed BullMQ job",
  labelNames: ["queue"],
  registers: [register],
});

export const queueScrapeUp = new client.Gauge({
  name: "signal_queue_scrape_up",
  help: "Whether queue telemetry collection succeeded (1) or failed (0)",
  labelNames: ["queue"],
  registers: [register],
});

export const queueWorkerEventsTotal = new client.Counter({
  name: "signal_queue_worker_events_total",
  help: "BullMQ worker lifecycle events",
  labelNames: ["queue", "event"],
  registers: [register],
});

export const queueJobDuration = new client.Histogram({
  name: "signal_queue_job_duration_seconds",
  help: "BullMQ job processing duration",
  labelNames: ["queue", "outcome"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 15, 30, 60, 120],
  registers: [register],
});

export const emailProviderRequestsTotal = new client.Counter({
  name: "signal_email_provider_requests_total",
  help: "Email provider acceptance attempts by provider and outcome",
  labelNames: ["provider", "outcome"],
  registers: [register],
});

export const emailProviderRequestDuration = new client.Histogram({
  name: "signal_email_provider_request_duration_seconds",
  help: "Email provider request duration",
  labelNames: ["provider", "outcome"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30],
  registers: [register],
});

export const aiTokensTotal = new client.Counter({
  name: "signal_ai_tokens_total",
  help: "AI tokens recorded from provider usage metadata",
  labelNames: ["provider", "model", "direction"],
  registers: [register],
});

export const aiEstimatedCostMicrosTotal = new client.Counter({
  name: "signal_ai_estimated_cost_micros_total",
  help: "Estimated AI cost in micro-US-dollars using the ledger pricing version",
  labelNames: ["provider", "model"],
  registers: [register],
});

export const aiBudgetRejectionsTotal = new client.Counter({
  name: "signal_ai_budget_rejections_total",
  help: "AI requests rejected before provider invocation by the tenant monthly budget",
  registers: [register],
});

export { register };
