# SIGNAL Broadcast Systems

SIGNAL is a self-hostable email campaign, audience, workflow and AI-assisted content
platform. The repository contains hardened application code and local/CI acceptance
gates, but it is currently a **controlled technical pilot**, not an accepted replacement
for a live email service.

## Current status

- **Locally verified:** PostgreSQL migrations, tenant-scoped RBAC, durable BullMQ email
  dispatch, consent/suppression tooling, object storage adapter, AI cost ledger,
  Prometheus metrics, Docker runtime smoke and desktop/mobile Playwright flows.
- **Requires live acceptance:** provider delivery, SPF/DKIM/DMARC, bounce/complaint
  processing, off-site backup, object storage credentials, Alertmanager routing,
  staging load/soak and legal/İYS operations.
- **Unavailable:** production OIDC/SAML SSO, MFA enrollment/recovery, SCIM and
  SMS/WhatsApp/in-app delivery providers.

See [Capability Status](docs/CAPABILITY_STATUS.md) for the evidence boundary and
[GAP Analysis](GAP_ANALIZ_RAPORU.md) for the current readiness assessment.

## Implemented application surface

- Email campaigns, scheduling, A/B dispatch and PostgreSQL-backed analytics.
- Tenant-scoped contacts, lists, segments, consent records and suppression ledger.
- Durable BullMQ/Redis delivery and workflow processing with admission control.
- Provider adapters for Amazon SES, SMTP, SendGrid, Mailgun and Resend.
- Gemini-assisted content and image tools with tenant budget reservation and usage ledger.
- S3/OCI-compatible object storage adapter with bounded uploads and signed reads.
- Health, Prometheus metrics, structured logs, Sentry integration and operational runbooks.
- Docker Compose deployment profile for Coolify on a low-memory Oracle VPS.

Provider adapters and operational tools are not evidence that an external account,
domain, legal process or production deployment has been accepted.

## Technology

- Node.js `22.22.0`, TypeScript, Express and Socket.IO.
- React 19, Vite and Tailwind CSS 4.
- PostgreSQL 16 through Prisma.
- Redis 7 and BullMQ.
- `pnpm 11.17.0` with a frozen lockfile.
- Docker multi-stage image with non-root runtime and health checks.

## Local development

### Prerequisites

- Node.js `22.22.0`
- Corepack and `pnpm 11.17.0`
- PostgreSQL 16
- Redis 7

### Setup

```bash
corepack enable
corepack prepare pnpm@11.17.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env
```

Set development-only PostgreSQL and Redis URLs in `.env`. Do not reuse production
credentials locally and do not commit `.env`.

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm dev
```

The application listens on `http://localhost:3000` by default. `GEMINI_API_KEY` and
external provider credentials are optional for UI development, but their associated
features remain unavailable without valid configuration.

## Verification

```bash
pnpm typecheck
pnpm test:run
pnpm test:coverage
pnpm build
```

The CI workflow additionally runs database migrations, coverage and bundle ratchets,
secret scanning, Playwright desktop/mobile flows, load smoke, query-plan gates,
backup/restore, AI ledger and restricted production-container checks.

## Deployment

Production-style deployment uses Docker Compose with PostgreSQL, Redis, persistent
volumes, health checks, backup tooling and explicit secret separation. Follow
[Deployment](docs/DEPLOYMENT.md) and [Runbook](docs/RUNBOOK.md). A successful local
container run does not replace staging or external-provider acceptance.

## Security and compliance boundary

The code includes security controls, consent records, suppression, export and deletion
workflows. These are technical tools, not a legal declaration of GDPR, KVKK or İYS
compliance. Production use requires named operational ownership and legal review.

Report security issues privately to the repository owner. Do not include credentials,
personal data or production exports in an issue.

## License

Licensed under the **GNU Affero General Public License v3.0 (`AGPL-3.0-only`)**.
See [LICENSE](LICENSE) and [Licensing Status](docs/LICENSING.md) for details.
