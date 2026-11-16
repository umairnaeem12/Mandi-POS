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
```

There is no working lint step: no ESLint config is checked in, so `npm run lint` exits with
"couldn't find a configuration file". Use the two builds above as the typecheck. Formatting is
Prettier (`.prettierrc`: single quotes, trailing commas, width 100), run with `npx prettier`.

`nest build` emits to `dist/src/main.js` because the Prisma seed files shift the output root.
The Dockerfile and `ecosystem.config.js` use that path, but `start:prod` still points at
`dist/main.js`, which does not exist. Run `node dist/src/main.js` instead.

Prisma (all proxy to `backend`):

```bash
npm run prisma:migrate      # prisma migrate dev
npm run prisma:generate
npm run prisma:seed         # roles, permissions, admin@restaurant.local / admin123
npm --workspace backend run prisma:seed:menu    # Mandi Bukhari menu (EN/AR)
npm --workspace backend run prisma:seed:permissions  # permissions + role mappings only; safe on production (DRY_RUN=1 to preview)
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

All tests live in `backend/test/app.e2e-spec.ts`; the frontend has none. `test/setup-app.ts`
rebuilds the global pipe, interceptor and filter by hand, so a global added to `main.ts` must
be added there too or the tests won't exercise it.

Desktop (needs the Rust toolchain): `npm --workspace desktop run dev` / `run build`.
`tauri.conf.json` has no `beforeDevCommand` or `beforeBuildCommand`, so start `dev:web` first
for dev, and run `build:web` with `VITE_API_URL` set before a desktop build. A production
bundle built without `VITE_API_URL` has an empty API URL and rejects every request.
A version bump touches `apps/desktop/package.json`, `src-tauri/tauri.conf.json`,
`src-tauri/Cargo.toml` and `Cargo.lock`.
Windows installers are built in CI only — `.github/workflows/desktop-windows.yml`,
triggered manually or by pushing a `v*` tag (Tauri cannot cross-compile Windows from macOS).

## Architecture

```
Tauri app / browser  ──HTTP + Socket.IO──►  NestJS  ──Prisma──►  PostgreSQL
```

The frontend never touches PostgreSQL directly. Workspaces: `backend/` (NestJS API +
Prisma schema), `apps/pos-web/` (React + Vite), `apps/desktop/` (Tauri v2 shell around
the built web app). `packages/shared-types` and `packages/validation` exist, but nothing
imports `@pos/*` today: backend and frontend each keep their own types
(`apps/pos-web/src/types`), so a change there has no effect on either app.

### Auth and permissions — the central cross-cutting concern

`JwtAuthGuard` and `PermissionsGuard` are registered globally as `APP_GUARD` in
[auth.module.ts](backend/src/auth/auth.module.ts). Consequences for every new endpoint:

- Routes are authenticated **by default**. Opt out with `@Public()`.
- Authorization is per-permission, not per-role: `@RequirePermissions('view_orders')`.
- [permissions.ts](backend/src/common/constants/permissions.ts) is the source of truth:
  `PERMISSIONS` defines the closed `PermissionKey` union, and both seed scripts read it and
  `ROLE_PERMISSIONS`. To add a permission, edit both there, mirror it in
  [packages/shared-types/src/index.ts](packages/shared-types/src/index.ts) to keep the copies
  in sync, then re-run a seed in every environment, because the DB rows
  (`Permission` / `RolePermission`) are not touched by migrations.
- Roles (`Admin`/`Manager`/`Cashier`/`Waiter`/`Kitchen`/`Inventory`) are just seeded
  permission bundles in `ROLE_PERMISSIONS` — they carry no hardcoded behavior.

The frontend mirrors this with `<ProtectedRoute permission="...">` in
[App.tsx](apps/pos-web/src/App.tsx) and `useAuthStore().hasPermission()`. UI gating is
cosmetic; the backend guard is the real check. Permissions are plain `string`s on the
frontend, so a typo in a permission name compiles and silently denies access.

If a login succeeds but bounces back to `/login`, suspect a role with no `RolePermission`
rows: `/auth/me` returns `permissions: []` and `landingPath()` in
[landing.ts](apps/pos-web/src/lib/landing.ts) falls through to `/login`. `prisma:seed:permissions`
repairs it. Where ts-node can't reach the DB (e.g. RDS via `psql` only),
[fix-admin-permissions.sql](backend/prisma/fix-admin-permissions.sql) does the same for the Admin role.

### Multi-tenancy

Every model hangs off `Restaurant`, except the global `Permission` catalogue. Controllers pull
the tenant from the JWT via `@CurrentUser('restaurantId')` and pass it into the service, which
puts it in the Prisma `where`. **Never** trust a `restaurantId` from the request body or params.
Child models (`OrderItem`, `InvoiceItem`, `OrderStatusLog`, `MenuItemImage`, `RolePermission`,
`RefreshToken`) have no `restaurantId` column, so scope those queries through the parent.

### Response envelope

`ResponseInterceptor` wraps every successful response as `{ success: true, data }`, and
`AllExceptionsFilter` normalizes errors. The frontend axios instance unwraps `.data`
transparently ([axios.ts](apps/pos-web/src/lib/axios.ts)), so API functions in
`apps/pos-web/src/api/` see the bare payload. A service returning `T` is what the caller gets.

### Real-time

There are two transports, chosen by env, behind one publishing API. Services inject
`RealtimeService` and emit via `toRestaurant` / `toKitchen` / `toAdminDashboard` / `toTable`,
never a transport directly, or events leak across tenants. Topics are `restaurant:<rid>`,
`kitchen:<rid>`, `admin-dashboard:<rid>` and `table:<rid>:<tableId>`; the restaurant id is
always the second `:` segment, which is what the Supabase RLS policy checks.

- **Supabase Realtime** (when `SUPABASE_URL` + `SUPABASE_SECRET_KEY` are set, i.e. on
  Vercel): the backend POSTs to the Realtime REST broadcast endpoint with `?private=true`,
  wrapped in `waitUntil` so the serverless function isn't frozen mid-send. Clients fetch a
  1h HS256 token from `GET /api/realtime/token` (signed with `SUPABASE_JWT_SECRET`,
  carries `restaurant_id`) and subscribe to private channels.
  [realtime-policies.sql](backend/supabase/realtime-policies.sql) holds the
  `realtime.messages` policy. It lives outside Prisma migrations because the `realtime`
  schema only exists on Supabase.
- **Socket.IO** (fallback: local dev, the AWS stack):
  [realtime.gateway.ts](backend/src/socket/realtime.gateway.ts) authenticates the socket
  from the JWT on connect, auto-joins the restaurant room, and handles `join.kitchen` /
  `join.admin-dashboard` / `join.table`.

On the frontend, [socket.ts](apps/pos-web/src/lib/socket.ts) picks the transport from
`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, connects when auth status becomes
`authenticated`, and dispatches every event to `useSocketEvent` subscribers, so pages don't
care which transport is live.

Mutations in `orders`/`invoices` services emit a socket event **after** the DB write, and
record an audit entry through `ActivitiesService.log`.
When adding an order/invoice mutation, follow the existing pairing: e.g. creating an order
emits both `order.created` (restaurant) and `kitchen.new_order` (kitchen), and a status
change that frees a table also emits `table.status_changed`. Frontend consumes these with
`useSocketEvent` from [socket.ts](apps/pos-web/src/lib/socket.ts), usually to invalidate a
TanStack Query key.

### Runtime-configurable backend URL

The frontend resolves its API base at runtime, not just build time
([config.ts](apps/pos-web/src/lib/config.ts)): the `serverApiUrl` key in `localStorage` beats
`VITE_API_URL`, which is meant to let one Tauri/tablet build point at a cashier PC's LAN
address. Use `getServerRoot()` / `getSocketUrl()` rather than composing URLs by hand.

The mechanism is only partly wired up:

- There is no settings UI. `setApiUrl()` has no callers, although the README and the axios
  error message still mention "Server settings", so the override can only be set by hand.
- `axios.ts` and `socket.ts` read the URL once at module load, so a change needs a page reload.
- `getSocketUrl()` prefers `VITE_SOCKET_URL` over the override, and the Windows CI build bakes
  that variable in. On those builds an override moves HTTP and uploads, while sockets stay on
  the baked-in server.

### Money and i18n

All monetary and stock columns are Prisma `Decimal` (`@db.Decimal(12,2)`, stock at
`(12,3)`). They serialize as strings over JSON — don't do float math on them client-side;
format via `apps/pos-web/src/lib/format.ts`.

Menu items and categories carry optional Arabic names alongside English. Resolve display
names through `useLang().dn(en, ar)` / `pickName` from
[lang.store.ts](apps/pos-web/src/stores/lang.store.ts) instead of reading `.name` directly.

### Uploads

[multer.config.ts](backend/src/uploads/multer.config.ts) switches storage by env:
S3-compatible storage when `S3_BUCKET` (or the older `AWS_S3_BUCKET`) is set, otherwise
local disk at `UPLOAD_DIR`, served statically at `/uploads` (outside the `/api` prefix).
Supabase Storage is used through its S3 API via `S3_ENDPOINT`, `S3_REGION`,
`S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`. Vercel reserves `AWS_*` names, hence the
`S3_*` set. The public URL is derived from the endpoint for Supabase, or set with
`S3_PUBLIC_URL`. Images are capped at 4 MB because Vercel limits request bodies to 4.5 MB.
Local disk does not work on Vercel: the filesystem is read-only.

### Printing

Receipts print only from `BillingPage` and `InvoicesPage`, both through `useReceiptPrint`
in [ReceiptPrint.tsx](apps/pos-web/src/components/ReceiptPrint.tsx). It mounts a copy of
`<Receipt>` in `#print-root` directly under `<body>`. Never call `window.print()` on the
on-screen preview: inside a dialog it lands at a fixed position, and the hidden app adds
blank A4 pages. Paper size (80mm, 58mm, A4) is per device in `localStorage`.
[print.ts](apps/pos-web/src/lib/print.ts) rewrites `@page` before each print. Chrome ignores
`size: 80mm auto`, so thermal rolls get the receipt's measured height. That is why
`#print-root` is laid out off-screen at print width rather than `display: none`.

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

Production is moving from AWS to Vercel + Supabase. Until cutover, AWS is still live:
Amplify (frontend, `amplify.yml`) → CloudFront (HTTPS) → Elastic Beanstalk Docker
(`Dockerfile`) → RDS PostgreSQL, and the Windows CI build bakes in the CloudFront URL.
Verify the live topology before changing deploy config.

The target, step by step in [DEPLOY-VERCEL-SUPABASE.md](DEPLOY-VERCEL-SUPABASE.md):
two Vercel projects from this repo, one for the frontend (repo root, `vercel.json`) and one
for the backend (root `backend`, zero-config NestJS from `src/main.ts`). Supabase provides
Postgres, Realtime and Storage. On Supabase, Prisma's `DATABASE_URL` is the transaction
pooler (port 6543, `?pgbouncer=true&connection_limit=3`), and migrations run against
`DIRECT_URL` (the session pooler) from the backend's `vercel-build` script on production
deploys only. Because the publishable key ships in the frontend,
[lock-down-data-api.sql](backend/supabase/lock-down-data-api.sql) must be re-run after
any migration that adds a table, or that table is open over Supabase's REST API.

[DEPLOY.md](DEPLOY.md), `deploy/nginx.conf`, `deploy/backend.env.example` and
`backend/ecosystem.config.js` describe the older EC2/Nginx/PM2 route, not the Beanstalk stack.

Project history and the phase-by-phase task tracker live in [PLAN.md](PLAN.md) and
[TASKS.md](TASKS.md).

On AWS the container runs `prisma migrate deploy` on boot; on Vercel `vercel-build` does it.
Neither runs a seed, so new permissions need a manual `prisma:seed:permissions`. Without
`S3_BUCKET` / `AWS_S3_BUCKET`, uploads go to the container disk and are lost on redeploy.
