# Restaurant POS System

Multi-user point-of-sale for restaurants. Monorepo: NestJS backend, React/Vite frontend, Tauri desktop wrapper.

See [PLAN.md](PLAN.md) for architecture and [TASKS.md](TASKS.md) for the task tracker.

## Stack

Backend: NestJS + Prisma + PostgreSQL · Frontend: React + Vite + Tailwind + shadcn/ui ·
State: Zustand + TanStack Query · Real-time: Socket.IO · Desktop: Tauri v2

## Architecture

```
Tauri App / Browser  ──HTTP + Socket──>  NestJS Backend  ──Prisma──>  PostgreSQL
```

The frontend never connects to PostgreSQL directly — all access goes through the backend API.

## Workspace layout

```
backend/        NestJS API + Prisma schema
apps/pos-web/   React + Vite frontend
apps/desktop/   Tauri v2 wrapper
packages/       shared-types, validation (shared Zod)
```

## Prerequisites

- Node.js >= 20 (see `.nvmrc`)
- PostgreSQL running locally
- (Tauri only) Rust toolchain — https://tauri.app/start/prerequisites/

## Setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure backend env
cp backend/.env.example backend/.env   # then edit DATABASE_URL + secrets

# 3. Create DB schema + seed
npm run prisma:migrate
npm run prisma:seed

# 4. Run
npm run dev:backend     # http://localhost:4000
npm run dev:web         # http://localhost:5173
```

## Default credentials (after seed)

```
email:    admin@restaurant.local
password: admin123
```

## Tests (backend e2e)

Runs against an isolated `restaurant_pos_test` database (never touches dev data):

```bash
createdb restaurant_pos_test          # once
cd backend
npm run test:e2e:setup                # reset + migrate + seed test DB
npm run test:e2e                      # 16 e2e tests
```

Override the DB with `TEST_DATABASE_URL` if your Postgres user/host differs.

## LAN / multi-device (local deployment)

The backend binds all interfaces and the frontend dev server uses `host: true`,
so tablets/kitchen screens on the same Wi-Fi can connect. On each device, open
the app and use **Server settings** on the login screen to point at the cashier
PC, e.g. `http://192.168.1.10:4000/api`. This is stored per-device and also
applies to the Tauri build.

## Desktop (Tauri)

Requires the Rust toolchain — see [apps/desktop/README.md](apps/desktop/README.md).
