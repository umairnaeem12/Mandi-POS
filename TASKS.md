# Restaurant POS — Task Breakdown

> Granular, trackable task list. Companion to [PLAN.md](PLAN.md).
> Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

---

## PH1 — Project Setup

### PH1.1 Monorepo
- [x] Create root `package.json` with workspaces (`apps/*`, `backend`, `packages/*`)
- [x] Add root `.gitignore`, `.editorconfig`, `.nvmrc`
- [x] Add `README.md` with run instructions
- [x] Configure ESLint + Prettier at root

### PH1.2 Backend scaffold
- [x] NestJS backend (TypeScript) scaffolded manually
- [x] Configure `tsconfig`, path aliases (`@/*`)
- [x] Add global `ValidationPipe`, exception filter, response interceptor
- [x] Add `ConfigModule` + env validation (Joi)
- [x] Setup CORS for `FRONTEND_URL`
- [x] Health endpoint `GET /api/health` (verified booting w/ DB)

### PH1.3 Database & Prisma
- [x] Local PostgreSQL verified (Homebrew, user `macbook`)
- [x] `prisma init`, set `DATABASE_URL`
- [x] Create base `schema.prisma` (Restaurant + RestaurantSettings)
- [x] First migration (`init`) + `prisma generate`
- [x] Create `PrismaModule` + `PrismaService`
- [x] Base seed (default restaurant + settings)

### PH1.4 Frontend scaffold
- [x] React + Vite + TS app (`apps/pos-web`)
- [x] Install Tailwind + configure (v3 for shadcn compat)
- [x] shadcn/ui base wiring (`cn()` util, deps, animate plugin) — components added per-feature later
- [x] Install Zustand, TanStack Query, React Hook Form, Zod, Axios
- [x] Setup Axios instance + request interceptor (token) + 401→refresh→retry (done in PH2)
- [x] Setup React Router + app shell (build verified)

### PH1.5 Tauri
- [x] Add Tauri v2 deps to `apps/desktop` + scripts
- [~] `tauri.conf.json` / `src-tauri` — needs `npm run tauri init` (requires Rust toolchain)
- [x] Document `DEFAULT_API_URL` wiring (see apps/desktop/README.md)
- [!] Verify dev build runs (Windows/macOS) — blocked on Rust toolchain install

### PH1.6 Shared packages
- [x] `packages/shared-types` (permission keys + enums)
- [x] `packages/validation` (shared Zod schemas, login schema)

---

## PH2 — Authentication & Staff

### PH2.1 Data model
- [x] User, Role, Permission, RolePermission models (+ RefreshToken, StaffStatus enum)
- [x] Seed permissions (23 keys per spec §7)
- [x] Seed default roles + role→permission mappings (Admin/Manager/Cashier/Waiter/Kitchen/Inventory)
- [x] Seed initial admin user (admin@restaurant.local / admin123)

### PH2.2 Auth backend
- [x] `POST /auth/login` (email/username + password)
- [x] Password hashing (argon2)
- [x] JWT access token (short expiry, 15m)
- [x] Refresh token issue + rotation + hashed storage (old token rejected on reuse)
- [x] `POST /auth/refresh`
- [x] `POST /auth/logout` (invalidate refresh)
- [x] `GET /auth/me`
- [x] `PATCH /auth/change-password` (revokes all refresh tokens)
- [x] `JwtAuthGuard` + `PermissionsGuard` (both global) + `@RequirePermissions()` + `@Public()` + `@CurrentUser()`
- [x] Block login + reject access for INACTIVE/DELETED staff (fresh load each request)

### PH2.3 Staff backend
- [x] `GET /staff`, `GET /staff/:id` (passwordHash never returned)
- [x] `POST /staff` (unique email + username)
- [x] `PATCH /staff/:id`
- [x] `DELETE /staff/:id` (soft delete + revoke sessions)
- [x] `PATCH /staff/:id/status` (revoke sessions on deactivate)
- [x] Guard: admin cannot delete/deactivate own account

### PH2.4 Roles & permissions backend
- [x] `GET /roles`, `POST /roles`, `PATCH /roles/:id`, `DELETE /roles/:id` (block system/in-use)
- [x] `GET /permissions`
- [x] `POST /roles/:id/permissions`

### PH2.5 Auth frontend
- [x] `/login` page + form (RHF + Zod)
- [x] Auth store (Zustand) + token persistence + bootstrap on load
- [x] Protected route wrapper + permission gating
- [x] Token refresh on 401 (single in-flight, retry) + forced logout event
- [x] Logout flow

### PH2.6 Staff/roles frontend
- [x] `/admin/staff` list + create + delete + status toggle (self-actions disabled)
- [x] `/admin/roles` + permission assignment UI
- [~] Staff inline edit form (create/delete/status done; full edit modal optional polish)

---

## PH3 — Restaurant Settings & Menu

### PH3.1 Restaurant settings
- [x] Restaurant + RestaurantSettings models + seed (done PH1, extended)
- [x] `GET /restaurant-settings` (any auth), `PATCH /restaurant-settings` (merged restaurant+settings, tx)
- [x] `POST /restaurant-settings/logo` (multer disk storage, static serve at /uploads, image-type filter, 5MB)
- [x] `/admin/restaurant-settings` page (tax, currency, receipt header/footer, prefix, logo upload)

### PH3.2 Categories
- [x] Category model (soft delete)
- [x] CRUD endpoints (unique active name per restaurant, enforced in service)
- [x] Soft delete instead of hard delete; activate/deactivate
- [x] `/admin/categories` page + item counts + active toggle

### PH3.3 Menu items
- [x] MenuItem + MenuItemImage models
- [x] CRUD endpoints + assign category (validates category ownership)
- [x] `PATCH /menu-items/:id/availability` (AVAILABLE/OUT_OF_STOCK/INACTIVE → boolean flags)
- [x] `POST /menu-items/:id/image` (upload; primary image sets imageUrl)
- [x] `GET /menu-items?categoryId=&availableOnly=` filters
- [x] `/admin/menu-items` page (price, availability select, image upload, prep time)

---

## PH4 — Inventory

- [x] InventoryItem + InventoryTransaction models (+ InventoryUnit, InventoryTransactionType enums)
- [x] Item CRUD (`/inventory/items*`) with soft delete; opening stock recorded as STOCK_IN
- [x] `POST /inventory/stock-in` (STOCK_IN / RETURN)
- [x] `POST /inventory/stock-out` (STOCK_OUT / WASTAGE; rejects negative result)
- [x] `POST /inventory/adjustment` (absolute target → computes delta)
- [x] Every change → InventoryTransaction in a DB transaction (previousStock/newStock chain verified)
- [x] `GET /inventory/transactions` (filter by item, limit)
- [x] `GET /inventory/low-stock` (currentStock <= lowStockLimit)
- [~] Socket emit `inventory.low_stock` / `inventory.stock_updated` — deferred to socket phase (PH5/6); service returns `isLowStock` flag ready to wire
- [x] `/admin/inventory` page (stock, low-stock highlight, in/out/adjust, recent movements, units)

---

## PH5 — Tables & Orders

### PH5.1 Tables
- [x] RestaurantTable model + seed 8 tables
- [x] `GET /tables` (with active-order summary), `GET /tables/:id`, `POST /tables`, `PATCH /tables/:id`, `DELETE`
- [x] `PATCH /tables/:id/status` (emits table.status_changed)
- [x] `GET /tables/:id/current-order`

### PH5.2 Orders backend
- [x] Order, OrderItem, OrderStatusLog models (+ OrderType/OrderStatus/TableStatus enums, Customer model)
- [x] `POST /orders` (sets table OCCUPIED, snapshots item name+price, ORD-NNNNNN number, tx)
- [x] `GET /orders` (filters: status/tableId/active), `GET /orders/:id` (with status logs)
- [x] `PATCH /orders/:id` (block if completed/cancelled)
- [x] `POST /orders/:id/items`, `PATCH .../items/:itemId`, `DELETE .../items/:itemId` (totals recompute)
- [x] `PATCH /orders/:id/status` + status log; COMPLETED frees table + sets completedAt
- [x] `POST /orders/:id/cancel` (requires reason, frees table)
- [x] `GET /orders/table/:tableId/active`
- [x] Enforce: one active dine-in order per table; dine-in requires tableId
- [x] Socket: `order.created/updated/status_changed/cancelled`, `table.*`, `kitchen.new_order/order_updated/order_status_changed`
- [x] Socket gateway (RealtimeGateway): JWT handshake auth, rooms (restaurant/kitchen/admin/table) — verified end-to-end
- [x] Wired deferred inventory emits (`inventory.stock_updated` / `inventory.low_stock`)

### PH5.3 Waiter/POS frontend
- [x] `/waiter/tables` — 8-table grid w/ live status (socket-refreshed, status colors)
- [x] Table order screen: category tabs → item → qty +/− → send to kitchen; add to active order live
- [x] `/waiter/orders` — orders list (shared OrdersPage, live)
- [x] `/admin/orders` — orders list with status filters + cancel (live)
- [x] Role-based landing after login (admin/waiter/kitchen/cashier) + socket connect/disconnect on login/logout
- [~] `/pos/*` route aliases + takeaway screen — deferred (waiter flow covers dine-in; POS aliases optional polish)

---

## PH6 — Kitchen Screen

- [x] `GET /kitchen/orders` (active orders, reuses OrdersService)
- [x] `PATCH /kitchen/orders/:id/status` (restricted to PREPARING/SERVED)
- [x] `/kitchen/orders` page — New / Preparing / Served columns
- [x] Show table number, items, qty, notes
- [x] Mark preparing / served
- [x] Socket: joins kitchen room, live `kitchen.new_order` / `kitchen.order_updated` / `kitchen.order_status_changed` — verified cross-client

---

## PH7 — Billing & Invoice

- [x] Invoice, InvoiceItem, Payment models (+ DiscountType/PaymentStatus/PaymentMethod enums)
- [x] `POST /invoices/from-order/:orderId` (DB transaction; restaurant + item snapshots; one invoice per order)
- [x] Unique invoice number w/ prefix (INV-NNNNNN from settings)
- [x] Apply discount (FIXED/PERCENTAGE, before tax) + tax from settings (clamped, isTaxEnabled honored)
- [x] `POST /invoices/:id/pay` (method, amount, change calc, PARTIAL/PAID status; supports split across payments)
- [x] On full payment: order → COMPLETED, table → AVAILABLE, status log (single tx)
- [x] `GET /invoices`, `GET /invoices/:id`, `GET /invoices/search` (number/customer/status/method/date filters)
- [x] `POST /invoices/:id/print` (emits invoice.printed)
- [x] HTML receipt template (80mm) w/ all required fields + @media print CSS
- [x] Block payment on settled invoice
- [x] Billing UI: review order → customer → discount → generate → pay → print (live receipt preview)
- [x] `/admin/invoices` (list + search + receipt modal), `/admin/billing/:orderId`, "Bill" button on orders
- [x] Socket: `invoice.created/paid/printed` (+ order.completed/table.status_changed on full payment)
- [x] Cashier landing → /admin/orders (operates via admin layout)
- [~] 58mm / A4 receipt size variants — only 80mm implemented (sufficient for v1; sizes are CSS tweaks)

---

## PH8 — Customers, Reports & Dashboard

### PH8.1 Customers
- [x] Customer model (done PH5, module now built)
- [x] CRUD + `GET /customers/search` + `GET /customers/:id/orders`
- [x] Create customer during billing (done PH7); contact uniqueness; derived stats (totalOrders/totalSpent/lastOrderAt)
- [x] `/admin/customers` page (CRUD + order-history modal)

### PH8.2 Reports
- [x] `GET /reports/sales/{today,weekly,monthly,yearly}` (full sales report data shape)
- [x] `GET /reports/revenue` (custom range), `/reports/orders` (status counts)
- [x] `GET /reports/best-selling-items` (groupBy invoice items)
- [x] `GET /reports/low-stock` (reuses InventoryService)
- [x] `GET /reports/staff-performance` (orders/invoices/sales per staff)
- [x] `GET /reports/table-sales` (per-table completed orders + sales)
- [x] Payment-method breakdown (cash/card/online within sales summary)
- [x] `/admin/reports` page (period selector + sales stats + best-selling + table sales + staff perf)

### PH8.3 Dashboard & Activities
- [x] Activity model + global ActivitiesService.log() (wired into orders create/cancel, invoice generate, payment)
- [x] `GET /dashboard/summary` (8 cards)
- [x] `GET /dashboard/recent-activities`
- [x] `GET /dashboard/inventory-status`
- [x] `GET /dashboard/staff-overview`
- [x] `GET /activities` (view_recent_activities)
- [x] `/admin/dashboard` (live cards + recent activity feed)
- [x] Socket: `dashboard.recent_activity_created` (live dashboard refresh)

---

## PH9 — Tauri Packaging

- [x] Configurable API URL (runtime, localStorage override — works in browser + Tauri)
- [x] Persist API URL config + "Server settings" panel on login (set cashier-PC LAN address)
- [x] axios / socket / asset URLs all read the runtime config
- [x] Rust toolchain installed (rustc 1.96.0); added to ~/.zshrc
- [x] `tauri init` — src-tauri scaffolded (Cargo.toml, icons, capabilities), identifier com.bukhari.pos, 1280×800 window, wired to Vite (devUrl :5173, dist ../pos-web/dist)
- [x] Rust app compiles cleanly (`cargo check` OK, 4m45s first build)
- [x] Run desktop in dev: `npm run dev:web` + `cd apps/desktop && npm run tauri dev`
- [ ] Build signed Windows installer (needs a Windows machine/CI)
- [x] Build macOS app — buildable via `npm run tauri build` (frontend dist required)
- [ ] (Later) printer integration

---

## PH10 — Testing & Production

- [x] e2e test harness (Jest + supertest, isolated test DB, safe npm scripts) — `npm run test:e2e:setup && npm run test:e2e`
- [x] API/e2e tests (auth, orders, invoices) — **16 tests, all passing**
- [x] Validation tests (missing/unknown fields, bad credentials)
- [x] Role/permission enforcement tests (403 for waiter; instant deactivation rejection)
- [x] Invoice calculation tests (discount-before-tax, change, completion + table free, duplicate guard)
- [x] Inventory transaction integrity tests (opening STOCK_IN, balance chain, negative guard, low-stock)
- [x] Order lifecycle tests (one-active-per-table, status transitions, cancel reason, dine-in needs table)
- [x] Real-time order flow — verified via cross-client socket tests (PH5/PH6)
- [!] Build production installer — blocked on Rust toolchain
- [~] Deploy local restaurant server + LAN verification — backend binds LAN (host:true), runtime API URL ready; needs physical multi-device setup

---

## Cross-Cutting / Definition of Done

- [ ] All major tables carry `restaurantId`
- [ ] All money/stock mutations wrapped in DB transactions
- [ ] Permissions enforced on backend (not FE-only)
- [ ] Responsive layouts verified on tablet/iPad widths
- [ ] Activity log written for all important actions
- [ ] Order status history persisted
- [ ] Price/name snapshots verified on historical invoices
