#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ]; then
  BACKUP_FILE="$(find "${BACKUP_DIR}/daily" -type f -name '*.dump' -print 2>/dev/null | sort | tail -n 1)"
fi

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Usage: $0 [backup-file.dump]" >&2
  exit 1
fi

case "${DATABASE_URL}" in
  postgresql://*|postgres://*) ;;
  *)
    echo "DATABASE_URL must be a PostgreSQL URI" >&2
    exit 1
    ;;
esac

checksum_file="${BACKUP_FILE}.sha256"
if [ -f "${checksum_file}" ]; then
  (
    cd "$(dirname "${BACKUP_FILE}")"
    sha256sum -c "$(basename "${checksum_file}")"
  )
else
  echo "WARNING: checksum file not found for ${BACKUP_FILE}" >&2
fi

pg_restore --list "${BACKUP_FILE}" >/dev/null

test_database="signal_restore_$(date -u +%Y%m%d%H%M%S)_$$"
database_url_without_query="${DATABASE_URL%%\?*}"
database_url_query=""
if [ "${database_url_without_query}" != "${DATABASE_URL}" ]; then
  database_url_query="?${DATABASE_URL#*\?}"
fi
database_url_prefix="${database_url_without_query%/*}"
test_database_url="${database_url_prefix}/${test_database}${database_url_query}"

cleanup() {
  dropdb --if-exists --force --maintenance-db="${DATABASE_URL}" "${test_database}" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

echo "Creating isolated restore database ${test_database}..."
createdb --maintenance-db="${DATABASE_URL}" "${test_database}"

echo "Restoring ${BACKUP_FILE}..."
pg_restore --exit-on-error --no-owner --no-acl --dbname="${test_database_url}" "${BACKUP_FILE}"

table_count="$(
  psql "${test_database_url}" -v ON_ERROR_STOP=1 -Atc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
)"

if [ "${table_count}" -lt 1 ]; then
  echo "Restore verification failed: no application tables found" >&2
  exit 1
fi

psql "${test_database_url}" -v ON_ERROR_STOP=1 -Atc 'SELECT count(*) FROM "_prisma_migrations";' >/dev/null
psql "${test_database_url}" -v ON_ERROR_STOP=1 -Atc 'SELECT count(*) FROM "Organization";' >/dev/null

echo "Restore verification passed: ${table_count} public tables"
