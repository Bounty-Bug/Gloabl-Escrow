# VaultBridge

A full-stack crypto escrow platform that lets buyers and sellers transact safely using cryptocurrency. Funds are held in escrow until both parties confirm delivery, with email notifications at every step.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/escrow-app run dev` — run the frontend (port 22614)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS + shadcn/ui + TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec)
- Email: Nodemailer + Gmail SMTP
- Crypto wallets: OKX API v5

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/escrows.ts` — escrow table schema
- `artifacts/api-server/src/routes/escrows.ts` — escrow CRUD + state machine routes
- `artifacts/api-server/src/routes/crypto.ts` — OKX currency + wallet address routes
- `artifacts/api-server/src/routes/stats.ts` — dashboard statistics
- `artifacts/api-server/src/lib/okx.ts` — OKX API v5 integration
- `artifacts/api-server/src/lib/mailer.ts` — Gmail email notifications
- `artifacts/escrow-app/src/` — React frontend

## Escrow State Machine

```
pending → funded (buyer confirms tx hash)
funded  → released (seller receives funds)
pending | funded → disputed (either party raises dispute)
pending → cancelled (only while unfunded — protects buyer)
```

Once funded, cancellation is blocked — parties must go through dispute resolution.

## Architecture decisions

- **OKX API fail-closed**: If OKX can't return a deposit address, escrow creation is rejected (no mock fallback in production). Currencies list uses mock fallback for resilience.
- **Atomic state transitions**: All status updates use `WHERE id = ? AND status = expected` conditional updates to prevent race conditions.
- **Email is best-effort**: Notification failures are logged but don't block the API response — escrow state changes succeed regardless.
- **No auth yet**: Authentication/authorization should be added before production deployment.

## Required Secrets

- `OKX_API_KEY` — OKX exchange API key (Read permission)
- `OKX_SECRET_KEY` — OKX secret key
- `OKX_API_PASSPHRASE` — OKX API passphrase
- `GMAIL_USER` — Gmail address for sending notifications
- `GMAIL_APP_PASSWORD` — Gmail App Password (not your account password)
- `DATABASE_URL` — Postgres connection string (auto-provisioned)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run codegen after every OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
- `zod/v4` is only available in lib packages — api-server uses plain `zod`
- OKX API requires your server IP to be whitelisted in the OKX API key settings
- Gmail App Passwords require 2FA to be enabled on the Google account

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
