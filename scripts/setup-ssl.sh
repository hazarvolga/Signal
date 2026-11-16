#!/bin/bash
set -euo pipefail

DOMAIN="${1:-${APP_URL#https://}}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"

if [ -z "${DOMAIN}" ]; then
  echo "Usage: $0 <domain>"
  exit 1
fi

echo "Setting up SSL for ${DOMAIN}"

if ! command -v certbot &>/dev/null; then
  echo "Installing certbot..."
  apt-get update && apt-get install -y certbot python3-certbot-nginx
fi

echo "Obtaining certificate..."
certbot certonly --nginx --non-interactive --agree-tos --email "admin@${DOMAIN}" -d "${DOMAIN}"

echo "Testing auto-renewal..."
certbot renew --dry-run

echo "SSL setup complete for ${DOMAIN}"
echo "Certificate: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
echo "Auto-renewal: certbot timer runs daily"