# Signal Capability Status

**Evidence date:** 14 August 2026

This document is the canonical boundary between implemented code and externally accepted
production capability. Code, local tests and CI configuration do not prove provider,
domain, legal or live deployment acceptance.

| Capability                           | Status                   | Evidence boundary                                                                                                        |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| PostgreSQL schema and migrations     | Code verified            | Clean PostgreSQL migration and local restore drills passed; live migration remains gated                                 |
| Local authentication and tenant RBAC | Code verified            | Password/session/RBAC tests exist; production HTTPS session smoke remains required                                       |
| Email queue and delivery ledger      | Code verified            | Durable dispatch, retry, idempotency and backpressure implemented                                                        |
| Email provider adapters              | Live acceptance required | SES/SMTP/SendGrid/Mailgun/Resend code exists; no provider account or delivery is accepted here                           |
| SPF, DKIM and DMARC                  | Live acceptance required | Must be verified on the sending domain                                                                                   |
| Bounce, complaint and unsubscribe    | Live acceptance required | Code paths exist; real signed provider events and suppression outcomes are required                                      |
| Consent, export and deletion tools   | Code verified            | Technical controls only; they are not legal GDPR/KVKK/İYS certification                                                  |
| OCI/S3-compatible asset storage      | Live acceptance required | Adapter and guards are tested; real bucket, lifecycle, scanner and credential rotation remain open                       |
| AI content and image tools           | Code verified            | Gemini calls, guardrails and tenant cost ledger exist; provider billing reconciliation remains open                      |
| Prometheus metrics and alert rules   | Code verified            | Rules and runbooks exist; scrape, routing and alert delivery drill remain open                                           |
| Backup and isolated restore          | Live acceptance required | Local MinIO off-site copy and isolated restore passed 2026-10-30; real S3/OCI and staging RPO/RTO acceptance remain open |
| OIDC/SAML SSO                        | Unavailable              | Production enablement is fail-closed until verified code exchange and token validation exist                             |
| MFA and recovery codes               | Unavailable              | Enrollment endpoint returns `501`; TOTP and recovery flow are not implemented                                            |
| SCIM provisioning                    | Unavailable              | No accepted implementation                                                                                               |
| SMS delivery                         | Unavailable              | Consent metadata exists, but no sending provider or delivery worker is implemented                                       |
| WhatsApp delivery                    | Unavailable              | Consent metadata exists, but no sending provider or delivery worker is implemented                                       |
| In-app/push delivery                 | Unavailable              | No production delivery provider is implemented                                                                           |

## Release boundary

- Controlled internal technical pilot: conditional go with isolated data.
- Consented customer pilot: no-go until P0 provider, domain, legal and staging gates pass.
- Full-list production launch: no-go.
- MailerLite shutdown: no-go until replacement acceptance evidence is complete.
- Public "GDPR/KVKK/İYS compliant" claim: no-go without legal and operational approval.

Current implementation progress is tracked in [GAP Closure Plan](GAP_CLOSURE_PLAN.md).
