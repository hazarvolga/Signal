# Referral Verification Delivery Runbook

## Alert

`SignalReferralVerificationDeliveryExhausted` fires when at least one verification
email exhausts all BullMQ delivery attempts within 15 minutes.

## Immediate triage

1. Open Infrastructure and review Referral Verification Health.
2. Identify the affected referral ID from structured logs. Do not copy email addresses into tickets unless access is restricted and the value is required.
3. Check `EMAIL_PROVIDER`, `FROM_EMAIL`, provider credentials, quota, throttling and provider status without printing secret values.
4. Confirm Redis and the `referral-verification` worker are healthy.
5. Separate provider rejection, invalid sender configuration, queue failure and application errors before changing configuration.

## Recovery

1. Correct the provider or sender configuration through the deployment secret manager.
2. Restart only the affected application replica if configuration reload requires it.
3. Use Growth > Pending Verifications to resend one failed record.
4. Confirm its delivery state becomes `ACCEPTED` before resending additional records.
5. Verify the final-failure counter stops increasing and the queue has no unexpected backlog.

Do not manually change a referral to `VERIFIED`. Verification must come from the
recipient link. Do not bulk replay failed jobs until one controlled resend succeeds.

## Escalation

Escalate when failures continue after a controlled resend, provider credentials cannot
be validated, or multiple organizations are affected. Preserve request IDs, job IDs,
provider response classifications and timestamps; redact credentials and verification tokens.

## Closure evidence

- A controlled resend is provider-accepted.
- No new final failures occur for 15 minutes.
- Pending and failed counts return to the expected baseline.
- Alertmanager resolves the alert and the incident record links the corrective action.
