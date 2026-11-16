#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set}"

if [ "${QUERY_PLAN_ALLOW_FIXTURE:-}" != "true" ]; then
  echo "Refusing to create analytics fixtures without QUERY_PLAN_ALLOW_FIXTURE=true" >&2
  exit 2
fi

database_name="$(psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc 'SELECT current_database();')"
case "${database_name}" in
  *test*|*ci*|*smoke*|*load*|*dr*) ;;
  *)
    echo "Refusing to create analytics fixtures in non-test database: ${database_name}" >&2
    exit 2
    ;;
esac

plan="$({
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -X <<'SQL'
BEGIN;

INSERT INTO "Organization" ("id", "name", "slug", "updatedAt")
VALUES ('analytics-plan-smoke-org', 'Analytics Plan Smoke', 'analytics-plan-smoke', CURRENT_TIMESTAMP);

INSERT INTO "Campaign" (
  "id", "name", "subject", "fromName", "fromEmail", "content", "organizationId", "updatedAt"
)
VALUES (
  'analytics-plan-smoke-campaign',
  'Analytics Plan Smoke',
  'Analytics plan smoke',
  'Signal Test',
  'analytics-plan@signal.test',
  '<p>Test</p>',
  'analytics-plan-smoke-org',
  CURRENT_TIMESTAMP
);

INSERT INTO "EngagementEvent" (
  "id", "campaignId", "type", "value", "metadata", "timestamp"
)
SELECT
  'analytics-plan-event-' || lpad(series::text, 5, '0'),
  'analytics-plan-smoke-campaign',
  (ARRAY['OPEN', 'CLICK', 'OPEN', 'OPEN', 'CLICK'])[(series % 5) + 1],
  1,
  CASE series % 4
    WHEN 0 THEN '{"device":"Mobile"}'
    WHEN 1 THEN '{"device":"Desktop"}'
    WHEN 2 THEN '{"device":"Tablet"}'
    ELSE '{"device":"Bot"}'
  END,
  CURRENT_TIMESTAMP - ((series % 1440) * INTERVAL '1 minute')
FROM generate_series(1, 10000) AS series;

ANALYZE "EngagementEvent";

\echo HOURLY_PLAN
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  date_trunc('hour', "timestamp" AT TIME ZONE 'UTC') AS "timestamp",
  count(*) FILTER (WHERE "type" = 'OPEN') AS "opens",
  count(*) FILTER (WHERE "type" = 'CLICK') AS "clicks"
FROM "EngagementEvent"
WHERE "campaignId" = 'analytics-plan-smoke-campaign'
  AND "type" IN ('OPEN', 'CLICK')
GROUP BY 1
ORDER BY 1;

\echo TYPE_PLAN
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT "type", count(*)
FROM "EngagementEvent"
WHERE "campaignId" = 'analytics-plan-smoke-campaign'
GROUP BY "type";

\echo DEVICE_PLAN
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  CASE
    WHEN "metadata"::jsonb ->> 'device' IN ('Mobile', 'Desktop', 'Tablet')
    THEN "metadata"::jsonb ->> 'device'
    ELSE 'Other'
  END AS "name",
  count(*) AS "value"
FROM "EngagementEvent"
WHERE "campaignId" = 'analytics-plan-smoke-campaign' AND "type" = 'OPEN'
GROUP BY 1;

ROLLBACK;

SELECT count(*) AS "remainingFixtures"
FROM "EngagementEvent"
WHERE "id" LIKE 'analytics-plan-event-%';
SQL
} 2>&1)"

printf '%s\n' "${plan}"

for marker in HOURLY_PLAN TYPE_PLAN DEVICE_PLAN; do
  if ! printf '%s\n' "${plan}" | grep -q "${marker}"; then
    echo "Analytics query-plan smoke failed: ${marker} is missing" >&2
    exit 1
  fi
done

if printf '%s\n' "${plan}" | grep -Eq 'substring\(|regexp_match\('; then
  echo "Analytics query-plan smoke failed: regex metadata parsing returned" >&2
  exit 1
fi

if ! printf '%s\n' "${plan}" | grep -q '(metadata)::jsonb'; then
  echo "Analytics query-plan smoke failed: JSONB device extraction was not planned" >&2
  exit 1
fi

device_ms="$(printf '%s\n' "${plan}" | awk '/DEVICE_PLAN/{seen=1; next} seen && /Execution Time:/{print $(NF-1); exit}')"
if [ -z "${device_ms}" ]; then
  echo "Analytics query-plan smoke failed: device execution time is missing" >&2
  exit 1
fi

if ! awk -v milliseconds="${device_ms}" 'BEGIN { exit !(milliseconds <= 100) }'; then
  echo "Analytics query-plan smoke failed: device aggregation ${device_ms}ms exceeds 100ms" >&2
  exit 1
fi

if ! printf '%s\n' "${plan}" | tail -n 5 | grep -Eq '^[[:space:]]*0[[:space:]]*$'; then
  echo "Analytics query-plan smoke failed: transaction fixtures were not rolled back" >&2
  exit 1
fi

echo "Analytics query-plan smoke passed: 10000 fixtures, JSONB device aggregation ${device_ms}ms, transaction rolled back"
