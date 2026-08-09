# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root (npm workspaces) unless noted.

```bash
npm install                 # install all workspaces
npm run dev:backend         # NestJS on http://localhost:4000/api (watch)
npm run dev:web             # Vite on http://localhost:5173 (host: true — LAN accessible)
npm run build:backend       # nest build
npm run build:web           # tsc -b && vite build
npm run lint                # eslint . --ext .ts,.tsx
```

Prisma (all proxy to `backend`):

```bash
npm run prisma:migrate      # prisma migrate dev
npm run prisma:generate
npm run prisma:seed         # roles, permissions, admin@restaurant.local / admin123
npm --workspace backend run prisma:seed:menu    # Mandi Bukhari menu (EN/AR)
npm --workspace backend run prisma:studio
npm --workspace backend run prisma:deploy       # production: migrate deploy
```

Backend e2e tests run against a **separate** `restaurant_pos_test` database and never
touch dev data. `createdb restaurant_pos_test` once, then from `backend/`:

```bash
npm run test:e2e:setup                          # reset + migrate + seed test DB
npm run test:e2e                                # all e2e specs (--runInBand)
npm run test:e2e -- -t "rejects wrong password" # single test by name
```

Override the DB with `TEST_DATABASE_URL` if your Postgres user/host differs from the
default `postgresql://macbook@localhost:5432/restaurant_pos_test`.

Desktop (needs the Rust toolchain): `npm --workspace desktop run dev` / `run build`.
Windows installers are built in CI only — `.github/workflows/desktop-windows.yml`,
triggered manually or by pushing a `v*` tag (Tauri cannot cross-compile Windows from macOS).

## Architecture

```
Tauri app / browser  ──HTTP + Socket.IO──►  NestJS  ──Prisma──►  PostgreSQL
```

The frontend never touches PostgreSQL directly. Workspaces: `backend/` (NestJS API +
Prisma schema), `apps/pos-web/` (React + Vite), `apps/desktop/` (Tauri v2 shell around
the built web app), `packages/shared-types` + `packages/validation` (shared enums/Zod).

### Auth and permissions — the central cross-cutting concern

`JwtAuthGuard` and `PermissionsGuard` are registered globally as `APP_GUARD` in
[auth.module.ts](backend/src/auth/auth.module.ts). Consequences for every new endpoint:

- Routes are authenticated **by default**. Opt out with `@Public()`.
- Authorization is per-permission, not per-role: `@RequirePermissions('view_orders')`.
- The permission list is a closed union in [permissions.ts](backend/src/common/constants/permissions.ts),
  duplicated in [packages/shared-types/src/index.ts](packages/shared-types/src/index.ts) and stored in
  the DB (`Permission` / `RolePermission`). Adding a permission means updating **all three**
  plus the seed, otherwise `PermissionKey` won't typecheck or the role won't have it.
- Roles (`Admin`/`Manager`/`Cashier`/`Waiter`/`Kitchen`/`Inventory`) are just seeded
  permission bundles in `ROLE_PERMISSIONS` — they carry no hardcoded behavior.

The frontend mirrors this with `<ProtectedRoute permission="...">` in
[App.tsx](apps/pos-web/src/App.tsx) and `useAuthStore().hasPermission()`. UI gating is
cosmetic; the backend guard is the real check.

### Multi-tenancy

Every model hangs off `Restaurant`. Controllers pull the tenant from the JWT via
`@CurrentUser('restaurantId')` and pass it into the service, which puts it in the Prisma
`where`. **Never** trust a `restaurantId` from the request body or params.

### Response envelope

`ResponseInterceptor` wraps every successful response as `{ success: true, data }`, and
`AllExceptionsFilter` normalizes errors. The frontend axios instance unwraps `.data`
transparently ([axios.ts](apps/pos-web/src/lib/axios.ts)), so API functions in
`apps/pos-web/src/api/` see the bare payload. A service returning `T` is what the caller gets.

### Real-time

[realtime.gateway.ts](backend/src/socket/realtime.gateway.ts) authenticates the socket
from the JWT on connect and auto-joins `restaurant:<id>`. Clients opt into extra rooms
(`join.kitchen`, `join.admin-dashboard`, `join.table`). Services inject `RealtimeGateway`
and emit via `toRestaurant` / `toKitchen` / `toAdminDashboard` / `toTable` — never
`server.emit` directly, or events leak across tenants.

Mutations in `orders`/`invoices` services emit a socket event **after** the DB write.
When adding an order/invoice mutation, follow the existing pairing: e.g. creating an order
emits both `order.created` (restaurant) and `kitchen.new_order` (kitchen), and a status
change that frees a table also emits `table.status_changed`. Frontend consumes these with
`useSocketEvent` from [socket.ts](apps/pos-web/src/lib/socket.ts), usually to invalidate a
TanStack Query key.

### Runtime-configurable backend URL

The frontend resolves its API base at runtime, not just build time
([config.ts](apps/pos-web/src/lib/config.ts)): a `localStorage` override ("Server settings"
on the login screen) beats `VITE_API_URL`. This is what lets one Tauri/tablet build point at
a cashier PC's LAN address. Uploads and sockets derive from the API URL with `/api` stripped,
so use `getServerRoot()` / `getSocketUrl()` rather than composing URLs by hand.

### Money and i18n

All monetary and stock columns are Prisma `Decimal` (`@db.Decimal(12,2)`, stock at
`(12,3)`). They serialize as strings over JSON — don't do float math on them client-side;
format via `apps/pos-web/src/lib/format.ts`.

Menu items and categories carry optional Arabic names alongside English. Resolve display
names through `useLang().dn(en, ar)` / `pickName` from
[lang.store.ts](apps/pos-web/src/stores/lang.store.ts) instead of reading `.name` directly.

### Uploads

[multer.config.ts](backend/src/uploads/multer.config.ts) switches storage by env: S3 when
`AWS_S3_BUCKET` is set, otherwise local disk at `UPLOAD_DIR`, served statically at
`/uploads` (outside the `/api` prefix).

## Conventions

- Backend env vars are validated by Joi at boot ([env.validation.ts](backend/src/config/env.validation.ts));
  a new required var must be added there or the app won't start. `FRONTEND_URL` is a
  comma-separated CORS allowlist (plus a `*.vercel.app` regex in [main.ts](backend/src/main.ts)).
- Global `ValidationPipe` uses `whitelist` + `forbidNonWhitelisted`, so any field not on the
  DTO is a 400 — DTOs must be complete.
- Frontend imports use the `@/` alias for `apps/pos-web/src`. Pages are lazy-loaded in
  `App.tsx` via the `named()` helper (named export → default) to keep recharts/framer-motion
  out of the login bundle; new routes should follow it.
- Server state lives in TanStack Query; only auth and language live in Zustand stores.
- `apps/pos-web/src/lib/demoApi.ts` is an offline axios adapter for demos. It is currently
  **unreferenced** — `getDemoAdapter()` has no callers, so demo mode is inert.

## Deployment

See [DEPLOY.md](DEPLOY.md) for the AWS setup (Amplify SPA → EC2/Nginx/PM2 → RDS). Per
[memory](/Users/macbook/.claude/projects/-Users-macbook-Downloads-Umair-Projects-bukhari-pos/memory/aws-deployment.md),
the live instance is currently an all-in-one EC2 box over HTTP, which differs from the
document — verify the actual topology before changing deploy config. `deploy/nginx.conf`
and `deploy/backend.env.example` are the server-side references.
