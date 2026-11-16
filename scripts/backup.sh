#!/bin/sh
set -eu

: "${DATABASE_URL:?DATABASE_URL must be set}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAILY="${RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${RETENTION_WEEKLY:-4}"
RETENTION_MONTHLY="${RETENTION_MONTHLY:-3}"
LOCK_DIR="${BACKUP_DIR}/.backup.lock"

case "${RETENTION_DAILY}:${RETENTION_WEEKLY}:${RETENTION_MONTHLY}" in
  *[!0-9:]*)
    echo "Retention values must be non-negative integers" >&2
    exit 1
    ;;
esac

umask 077
mkdir -p "${BACKUP_DIR}/daily" "${BACKUP_DIR}/weekly" "${BACKUP_DIR}/monthly"

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  echo "Another backup process is already running" >&2
  exit 1
fi

TEMP_FILE=""
cleanup() {
  if [ -n "${TEMP_FILE}" ] && [ -f "${TEMP_FILE}" ]; then
    rm -f "${TEMP_FILE}"
  fi
  rmdir "${LOCK_DIR}" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM

timestamp="$(date -u +%Y%m%d_%H%M%S)"
day_of_week="$(date -u +%u)"
day_of_month="$(date -u +%d)"
backup_name="signal_${timestamp}.dump"
daily_file="${BACKUP_DIR}/daily/${backup_name}"
TEMP_FILE="${daily_file}.partial"

echo "Creating PostgreSQL backup ${backup_name}..."
pg_dump --format=custom --no-owner --no-acl --file="${TEMP_FILE}" "${DATABASE_URL}"

if [ ! -s "${TEMP_FILE}" ]; then
  echo "Backup file is empty" >&2
  exit 1
fi

pg_restore --list "${TEMP_FILE}" >/dev/null
mv "${TEMP_FILE}" "${daily_file}"
TEMP_FILE=""
(
  cd "${BACKUP_DIR}/daily"
  sha256sum "${backup_name}" > "${backup_name}.sha256"
)

if [ "${day_of_week}" = "7" ]; then
  cp "${daily_file}" "${BACKUP_DIR}/weekly/${backup_name}"
  cp "${daily_file}.sha256" "${BACKUP_DIR}/weekly/${backup_name}.sha256"
fi

if [ "${day_of_month}" = "01" ]; then
  cp "${daily_file}" "${BACKUP_DIR}/monthly/${backup_name}"
  cp "${daily_file}.sha256" "${BACKUP_DIR}/monthly/${backup_name}.sha256"
fi

find "${BACKUP_DIR}/daily" -type f -mtime "+${RETENTION_DAILY}" -delete
find "${BACKUP_DIR}/weekly" -type f -mtime "+$((RETENTION_WEEKLY * 7))" -delete
find "${BACKUP_DIR}/monthly" -type f -mtime "+$((RETENTION_MONTHLY * 31))" -delete

if [ -n "${S3_BACKUP_BUCKET:-}" ]; then
  if ! command -v aws >/dev/null 2>&1; then
    echo "S3_BACKUP_BUCKET is set but the aws CLI is unavailable" >&2
    exit 1
  fi
  s3_prefix="s3://${S3_BACKUP_BUCKET%/}/daily"
  aws s3 cp "${daily_file}" "${s3_prefix}/${backup_name}" --sse AES256 --only-show-errors
  aws s3 cp "${daily_file}.sha256" "${s3_prefix}/${backup_name}.sha256" --sse AES256 --only-show-errors
fi

size_bytes="$(wc -c < "${daily_file}" | tr -d ' ')"
echo "Backup verified: ${daily_file} (${size_bytes} bytes)"
