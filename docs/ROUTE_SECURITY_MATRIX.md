# Route Security Matrix

This matrix is the production authorization contract. A route not covered by one
of these classes must fail closed.

| Route family | Access class | Tenant source | Required control |
|---|---|---|---|
| `/api/auth/login`, `/api/auth/sso/*` | Public authentication | Resolved only after verified identity | Rate limit; production SSO requires verified state and provider response |
| `/api/csrf-token` | Session bootstrap | Session | Same-site cookie and CSRF token binding |
| `/api/unsubscribe/:token` | Public token capability | Token lookup | Random token; GET read-only; RFC 8058 POST is idempotent |
| `/api/preferences/:token` | Public token capability | Token lookup | Random token; requested lists constrained to token owner organization |
| `/api/webhooks/ses` | Signed webhook | Provider message ledger | SNS signature, topic allowlist and replay protection |
| `/api/webhooks/shopify` | Signed webhook | Verified shop integration | Raw-body HMAC and integration-to-organization mapping |
| `/api/email/track/open/:token`, `/api/email/track/click/:token` | Public signed capability | Delivery ledger in signed token | HMAC, expiry, tenant/delivery binding, replay ledger and safe redirect |
| `/api/v1/*` | API key | Hashed API key record | Per-route scope, tenant and rate-limit enforcement |
| `/api/me`, contacts, campaigns, templates, flows, forms, assets, analytics, validation, products, revenue, integrations | Authenticated | `req.user.organizationId` | Active session; every lookup and mutation tenant-scoped |
| Campaign dispatch and scheduling | Role protected | `req.user.organizationId` | `OWNER`, `ADMIN` or `EDITOR`; explicit audience required |
| Team, roles, API keys, SSO config, compliance administration, webhook configuration | Admin protected | `req.user.organizationId` | `OWNER` or `ADMIN`; secret-safe responses |
| Approval decisions | Role protected | `req.user.organizationId` | Authorized reviewer; referenced entity must belong to tenant |
| `/metrics` | Internal operational | None | Loopback or constant-time metrics token in production |
| `/health`, `/api/health` | Public operational | None | No secrets or internal error details |
| Socket.IO collaboration | Authenticated session | Session user organization | ACTIVE user, tenant-prefixed allowlisted room, payload and rate limits |

## Mandatory negative tests

- Anonymous requests to every authenticated family return `401`.
- A user without an allowed role receives `403` for administrative mutation.
- Tenant A cannot read, update or delete a known Tenant B identifier.
- An API key without the exact route scope receives `403`.
- Unsigned, wrong-topic, stale or replayed provider webhooks are rejected.
- A production request cannot reach mock SSO, simulation writes or executable
  custom-filter code.
