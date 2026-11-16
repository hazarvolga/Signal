#!/bin/bash
set -euo pipefail

echo "Renewing SSL certificates..."
certbot renew --quiet

echo "Reloading nginx..."
systemctl reload nginx

echo "SSL renewal complete at $(date -u --iso-8601=seconds)"