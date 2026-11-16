#!/bin/sh
set -eu

require_env() {
  variable_name="$1"
  eval "variable_value=\${${variable_name}:-}"
  if [ -z "${variable_value}" ]; then
    echo "FATAL: ${variable_name} must be set" >&2
    exit 1
  fi
}

require_env DATABASE_URL
require_env REDIS_URL
require_env SESSION_SECRET
require_env APP_URL
require_env DATA_EXPORT_ENCRYPTION_KEY
require_env CONSENT_TEXT_VERSION

if [ "${NODE_ENV:-production}" = "production" ] && [ "${#SESSION_SECRET}" -lt 64 ]; then
  echo "FATAL: SESSION_SECRET must contain at least 64 characters in production" >&2
  exit 1
fi

if [ "${NODE_ENV:-production}" = "production" ] && ! printf '%s' "${DATA_EXPORT_ENCRYPTION_KEY}" | grep -Eq '^[0-9a-fA-F]{64}$'; then
  echo "FATAL: DATA_EXPORT_ENCRYPTION_KEY must be 64 hexadecimal characters" >&2
  exit 1
fi

echo "Applying pending Prisma migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Starting SIGNAL..."
exec node dist-server/server.js
