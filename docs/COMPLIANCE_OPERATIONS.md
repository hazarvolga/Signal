# Compliance Operations

This document defines technical controls and operator gates. It is not legal
advice and does not authorize a claim that Signal is KVKK, GDPR or İYS compliant.
That claim requires documented review by the organization's legal/compliance
owner.

## Commercial-email send gate

A campaign may enter the delivery queue only when all of the following are true:

1. The recipient belongs to the campaign organization and explicit audience.
2. Email consent is true and the contact status is `SUBSCRIBED`.
3. No active unsubscribe, hard-bounce or complaint suppression exists.
4. The consent evidence records source, timestamp and the applicable consent-text
   version/purpose.
5. For recipients subject to Turkish commercial-message rules, the operator has
   completed the İYS reconciliation below.

## İYS gate

Signal does not claim a live İYS API integration until credentials, contract,
test environment and legal mapping are supplied. Until then, commercial sends
are fail-closed operationally:

- Export the intended audience and suppression changes for the compliance owner.
- Reconcile the audience against the current İYS merchant account.
- Import/review resulting opt-outs before queueing the campaign.
- Record the reconciliation timestamp, operator, merchant/account identifier and
  evidence location in the campaign approval record.
- Do not enable production dispatch if this evidence is absent.

The owner must define which messages are commercial versus transactional and
which recipient jurisdictions apply.

## Data-subject requests

- Only `OWNER` or `ADMIN` may create a request.
- Requests execute through the durable queue; changing status manually is not a
  completion mechanism.
- Export artifacts are encrypted, access-controlled, time-limited and removed
  after expiry.
- Delete requests remove or irreversibly anonymize direct identifiers while
  retaining only records required by an approved legal-retention schedule.
- Every transition is auditable and failures remain visible for retry.

## Retention defaults requiring owner approval

| Data | Proposed maximum | Disposal |
|---|---:|---|
| Data export artifact | 7 days | Delete encrypted artifact |
| Provider webhook raw payload | 30 days | Delete payload; retain non-PII counters |
| Delivery ledger | 24 months | Aggregate/anonymize unless legal hold applies |
| Consent evidence and suppression | Legal owner decision | Preserve proof while legal basis requires |
| Application audit logs | 12 months | Delete or archive to restricted storage |
| Backups | 30 daily + 12 monthly | Encrypted expiry deletion |

Production deployment is blocked until a named owner approves or replaces these
periods and documents legal holds, breach response and data-processor contracts.

## Incident rule

On suspected unauthorized disclosure, stop campaign workers, preserve immutable
logs, rotate affected credentials, identify impacted tenants and follow the
organization's legal notification procedure. Never delete evidence during an
active incident.

