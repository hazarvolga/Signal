# Service Level Objectives (SLOs)

## Tier-1 (Critical Path)

| Endpoint                  | SLO Target          | Measurement Window |
| ------------------------- | ------------------- | ------------------ |
| `GET /health`             | 99.9% availability  | 30 days            |
| `GET /api/health`         | 99.9% availability  | 30 days            |
| `GET /api/stats/summary`  | p95 latency < 200ms | 30 days            |

## Tier-2 (Core API)

| Endpoint                 | SLO Target           | Measurement Window |
| ------------------------ | -------------------- | ------------------ |
| `GET /api/contacts`      | p95 latency < 500ms  | 30 days            |
| `GET /api/campaigns`     | p95 latency < 500ms  | 30 days            |
| `GET /api/segments`      | p95 latency < 500ms  | 30 days            |
| `GET /api/templates`     | p95 latency < 500ms  | 30 days            |
| `GET /api/flows`         | p95 latency < 500ms  | 30 days            |
| `GET /api/events`        | p95 latency < 500ms  | 30 days            |

## Tier-3 (Analytics)

| Endpoint                          | SLO Target           | Measurement Window |
| --------------------------------- | -------------------- | ------------------ |
| `GET /api/analytics/deliverability` | p95 latency < 1000ms | 30 days            |
| `GET /api/analytics/funnel`         | p95 latency < 1000ms | 30 days            |
| `GET /api/analytics/cohorts`        | p95 latency < 1000ms | 30 days            |

## Error Budget Policy

- **Monthly error budget**: 43 minutes of downtime (99.9% uptime equivalent).
- **Burn rate alerts**:
  - Fast burn: > 2% of monthly budget consumed in 1 hour → page on-call.
  - Slow burn: > 10% of monthly budget consumed in 3 days → create ticket.
- **Budget exhaustion**: When error budget is fully consumed, freeze all non-critical deployments until the next window. Only security patches and Tier-1 incident fixes are permitted.
- **Recovery**: Budget resets on the 1st of each month. Any unused budget may not be carried forward.

## Alert Thresholds

| Metric                | Warning                          | Critical                          |
| --------------------- | -------------------------------- | --------------------------------- |
| API error rate (5xx)  | > 1% for 5 minutes               | > 5% for 2 minutes                |
| p95 latency           | > 2x SLO target for 5 minutes    | > 5x SLO target for 2 minutes     |
| Availability          | < 99.95% over rolling 1h window  | < 99.5% over rolling 10m window   |
| VU saturation         | > 80% of provisioned capacity    | > 95% of provisioned capacity     |

## Runbook

```bash
# Smoke test (pre-deploy / CI gate)
k6 run tests/performance/smoke.js

# Load test (staging validation)
k6 run tests/performance/load.js

# Stress test (capacity planning)
k6 run tests/performance/stress.js

# Override base URL
k6 run -e BASE_URL=https://staging.example.com tests/performance/load.js

# Output to InfluxDB for Grafana dashboards
k6 run --out influxdb=http://localhost:8086/k6 tests/performance/load.js
```
