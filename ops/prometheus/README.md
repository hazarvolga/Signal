# Signal Monitoring Overlay

This overlay connects Signal metrics, the referral verification alert rule and an
externally managed Alertmanager configuration. It does not store notification URLs,
recipient addresses or metric credentials in the repository.

## Required secret files

- `METRICS_TOKEN_FILE`: a file containing exactly the same value as the app's `METRICS_TOKEN`.
- `ALERTMANAGER_CONFIG_PATH`: an Alertmanager configuration managed through Coolify or the host secret store.

Both files must be readable only by the deployment account. Do not place them inside
the repository. Prometheus and Alertmanager ports bind to localhost by default.

## Start

```bash
METRICS_TOKEN_FILE=/secure/signal-metrics-token \
ALERTMANAGER_CONFIG_PATH=/secure/alertmanager.yml \
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d prometheus alertmanager
```

## Acceptance checks

1. Confirm the Prometheus target named `signal` is `UP`.
2. Confirm `SignalReferralVerificationDeliveryExhausted` appears in loaded rules.
3. Trigger one controlled failure in staging only.
4. Confirm Alertmanager receives and routes the warning to the approved test receiver.
5. Resolve the fixture and confirm the alert resolves.

Configuration validation and a local scrape do not prove notification delivery. Keep
the feature in live-acceptance-pending state until the staging receiver records both
the firing and resolved notifications.
