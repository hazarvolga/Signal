#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set}"

if [ "${QUERY_PLAN_ALLOW_FIXTURE:-}" != "true" ]; then
  echo "Refusing to create query-plan fixtures without QUERY_PLAN_ALLOW_FIXTURE=true" >&2
  exit 2
fi

database_name="$(psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc 'SELECT current_database();')"
case "${database_name}" in
  *test*|*ci*|*smoke*|*load*|*dr*) ;;
  *)
    echo "Refusing to create fixtures in non-test database: ${database_name}" >&2
    exit 2
    ;;
esac

plan="$({
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -X <<'SQL'
BEGIN;

INSERT INTO "Organization" ("id", "name", "slug", "updatedAt")
VALUES ('query-plan-smoke-org', 'Query Plan Smoke', 'query-plan-smoke', CURRENT_TIMESTAMP);

INSERT INTO "Contact" (
  "id",
  "email",
  "firstName",
  "lastName",
  "organizationId",
  "createdAt",
  "updatedAt"
)
SELECT
  'query-plan-contact-' || lpad(series::text, 5, '0'),
  'query-plan-' || series || '@signal.test',
  'Query',
  'Plan ' || series,
  'query-plan-smoke-org',
  TIMESTAMP '2026-01-01 00:00:00' + ((series / 10) * INTERVAL '1 millisecond'),
  CURRENT_TIMESTAMP
FROM generate_series(1, 10000) AS series;

ANALYZE "Contact";

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT "id", "email", "createdAt"
FROM "Contact"
WHERE "organizationId" = 'query-plan-smoke-org'
  AND (
    "createdAt",
    "id"
  ) < (
    TIMESTAMP '2026-01-01 00:00:00.500',
    'query-plan-contact-05000'
  )
ORDER BY "createdAt" DESC, "id" DESC
LIMIT 251;

ROLLBACK;
SQL
} 2>&1)"

printf '%s\n' "${plan}"

if ! printf '%s\n' "${plan}" | grep -q 'Contact_organizationId_createdAt_id_idx'; then
  echo "Query-plan smoke failed: cursor pagination index was not used" >&2
  exit 1
fi

if printf '%s\n' "${plan}" | grep -q 'Seq Scan on Contact'; then
  echo "Query-plan smoke failed: Contact sequential scan detected" >&2
  exit 1
fi

if printf '%s\n' "${plan}" | grep -Eq 'Rows Removed by Filter: [1-9]'; then
  echo "Query-plan smoke failed: deep cursor rows were discarded by a filter" >&2
  exit 1
fi

echo "Query-plan smoke passed: 10000 fixtures, indexed cursor pagination, transaction rolled back"
