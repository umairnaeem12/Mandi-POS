# Restaurant POS System — Implementation Plan & Task Tracker

> Derived from **Restaurant POS System – Project Specification Document**.
> Scope: First version = single restaurant, 8 tables, local deployment.

---

## 1. Tech Stack (locked)

| Layer | Choice |
|---|---|
| Backend | Node.js + NestJS + TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Frontend | React + Vite + TypeScript |
| Desktop/Tablet | Tauri v2 |
| UI | Tailwind CSS + shadcn/ui |
| Client state | Zustand |
| Server state | TanStack Query |
| Forms / Validation | React Hook Form + Zod |
| HTTP | Axios |
| Auth | JWT access + rotating refresh token |
| Authorization | RBAC + DB-stored permissions |
| Real-time | Socket.IO |
| Printing | HTML receipt (v1) → Tauri printer (later) |
| Deployment | Local restaurant server (v1) → cloud/hybrid (later) |

**Architecture rule:** Tauri/Browser → HTTP API + Socket → NestJS → Prisma → PostgreSQL.
The frontend must **never** connect to PostgreSQL directly.

---

## 2. Monorepo Structure

```
restaurant-pos/
├── apps/
│   ├── pos-web/          # React + Vite frontend
│   └── desktop/          # Tauri wrapper (src-tauri/)
├── backend/
│   ├── src/              # NestJS modules (see §11 of spec)
│   ├── prisma/           # schema.prisma + migrations
│   ├── package.json
│   └── .env
├── packages/
│   ├── shared-types/
│   └── validation/       # shared Zod schemas
└── package.json
```

---

## 3. Roles & Permissions (DB-driven)

**Roles:** Super Admin (future), Restaurant Admin, Manager, Cashier, Waiter, Kitchen Staff, Inventory Staff.

**Permission keys** (stored in DB, not hardcoded in FE):
`manage_restaurant_settings`, `view_dashboard`, `manage_staff`, `manage_roles`,
`manage_permissions`, `manage_categories`, `manage_menu_items`, `manage_inventory`,
`view_inventory`, `create_order`, `update_order`, `cancel_order`, `view_orders`,
`send_order_to_kitchen`, `update_order_status`, `generate_invoice`, `apply_discount`,
`receive_payment`, `print_receipt`, `manage_customers`, `view_reports`,
`search_invoices`, `view_recent_activities`.

---

## 4. Core Business Rules (must-enforce)

- [ ] Passwords hashed before save; inactive/deleted staff cannot log in.
- [ ] Access tokens expire; refresh tokens rotate. Backend validates every protected request.
- [ ] One table = one active dine-in order at a time.
- [ ] Table → OCCUPIED on order create; → AVAILABLE after invoice paid + order completed.
- [ ] Order items store **price + name snapshot** (old invoices keep original prices).
- [ ] Invoices store restaurant snapshot details; invoice number unique.
- [ ] Tax calculated from restaurant settings; discount before/after tax per config.
- [ ] Paid invoice not editable except refund/void flow.
- [ ] Completed orders cannot be edited; cancelled orders keep cancellation reason.
- [ ] **Every** stock change creates an `InventoryTransaction` (never bare stock update).
- [ ] Order status history saved in `order_status_logs`.
- [ ] `restaurantId` on all major tables (multi-branch readiness).
- [ ] DB transactions for: invoice-from-order, payment, order completion, table status, inventory deduction, stock in/out, order cancellation, refund.

---

## 5. Database Models (Prisma)

restaurants · restaurant_settings · users · roles · permissions · role_permissions ·
staff_profiles · categories · menu_items · menu_item_images · restaurant_tables ·
orders · order_items · order_status_logs · invoices · invoice_items · payments ·
customers · inventory_items · inventory_transactions · activities

**Enums:** StaffStatus, MenuAvailability, TableStatus, OrderType, OrderStatus,
DiscountType, PaymentStatus, PaymentMethod, InventoryUnit, InventoryTransactionType.

---

## 6. Development Phases (Tasks)

### Phase 1 — Project Setup
- [ ] Init monorepo (pnpm/npm workspaces)
- [ ] Scaffold NestJS backend
- [ ] Provision PostgreSQL (local)
- [ ] Setup Prisma + base schema + first migration
- [ ] Scaffold React/Vite frontend
- [ ] Tailwind CSS + shadcn/ui
- [ ] Tauri v2 wrapper
- [ ] Env var files (backend / frontend / tauri)

### Phase 2 — Authentication & Staff
- [ ] Login (email/username + password)
- [ ] JWT access + refresh token rotation
- [ ] Password hashing
- [ ] Roles + permissions + role_permissions seed
- [ ] RBAC guards + permission guards
- [ ] Staff CRUD + activate/deactivate + status
- [ ] Protected routes (FE) + auth store (Zustand)
- [ ] `GET /auth/me`, change-password
- [ ] Guard: admin cannot delete own account

### Phase 3 — Restaurant & Menu
- [ ] Restaurant settings (GET/PATCH) + tax/currency/receipt config
- [ ] Logo upload (local storage, `uploads/`)
- [ ] Category CRUD + soft delete/deactivate (unique name per restaurant)
- [ ] Menu item CRUD + assign category
- [ ] Product image upload
- [ ] Availability status (AVAILABLE / OUT_OF_STOCK / INACTIVE)

### Phase 4 — Inventory
- [ ] Inventory item CRUD
- [ ] Stock-in / stock-out / adjustment endpoints
- [ ] Inventory transactions (auto-created on every change)
- [ ] Low-stock alerts + `GET /inventory/low-stock`
- [ ] Socket: `inventory.low_stock`, `inventory.stock_updated`

### Phase 5 — Tables & Orders
- [ ] Seed 8 default tables
- [ ] Table status management + current-order endpoint
- [ ] Waiter table grid screen (8 tables w/ live status)
- [ ] Create order for table; add/update/remove items + notes + qty
- [ ] Send order to kitchen/admin
- [ ] Order status flow (PENDING→PREPARING→SERVED→COMPLETED/CANCELLED)
- [ ] Socket: `order.*`, `table.*`, `kitchen.new_order`

### Phase 6 — Kitchen Screen
- [ ] Kitchen order list (New / Preparing / Served sections)
- [ ] Status updates (preparing / served)
- [ ] Real-time updates + notify waiter/admin

### Phase 7 — Billing & Invoice
- [ ] Generate invoice from order (DB transaction)
- [ ] Add customer name/contact (create customer during billing)
- [ ] Apply discount (FIXED / PERCENTAGE)
- [ ] Calculate tax from settings
- [ ] Payment (CASH/CARD/BANK_TRANSFER/ONLINE/SPLIT) + change calc
- [ ] Payment status (UNPAID/PARTIAL/PAID/REFUNDED)
- [ ] HTML receipt template (58mm / 80mm / A4) + browser print
- [ ] Complete order → free table
- [ ] Socket: `invoice.created`, `invoice.paid`, `invoice.printed`

### Phase 8 — Customers & Reports
- [ ] Customer CRUD + search (name/contact) + order history
- [ ] Sales reports: today / weekly / monthly / yearly
- [ ] Revenue, total orders, best-selling items, low-stock report
- [ ] Staff performance, table-wise sales, payment-method report
- [ ] Invoice search (filters: name/contact/number/date range/status/method)
- [ ] Admin dashboard summary + recent activities + cards

### Phase 9 — Tauri Packaging
- [ ] Build Windows desktop app
- [ ] Build macOS app
- [ ] Configurable local API URL + app settings
- [ ] (Later) printer support

### Phase 10 — Testing & Production
- [ ] Backend validation + API tests
- [ ] Role/permission tests
- [ ] Invoice calculation + inventory transaction tests
- [ ] Real-time order flow tests
- [ ] Production installer + deploy local restaurant server

---

## 7. API Surface (reference)

Auth · Restaurant Settings · Staff · Roles/Permissions · Categories · Menu Items ·
Inventory · Tables · Orders · Kitchen · Invoices · Customers · Reports · Dashboard.
(Full endpoint list in spec §12.)

---

## 8. Real-Time Socket Events

- **Joins:** `join.restaurant`, `join.kitchen`, `join.admin-dashboard`, `join.table`
- **Order:** created / updated / cancelled / status_changed / completed
- **Kitchen:** new_order / order_updated / order_status_changed
- **Table:** status_changed / order_created / order_completed
- **Invoice:** created / paid / printed
- **Inventory:** low_stock / stock_updated
- **Dashboard:** sales_updated / order_count_updated / recent_activity_created

---

## 9. Frontend Pages

- **Public:** `/login`
- **Admin:** dashboard, restaurant-settings, staff, roles, categories, menu-items, inventory, tables, orders, invoices, customers, reports, activities
- **POS:** tables, table order, takeaway, orders, invoice view
- **Waiter:** tables, table order, orders
- **Kitchen:** orders
- **Cashier:** orders, invoices, customers

---

## 10. Recommended Build Order

1. Backend (NestJS + PostgreSQL + Prisma) — schema first.
2. React/Vite frontend (admin → waiter → cashier → kitchen).
3. Socket.IO real-time order updates.
4. Invoice + receipt printing.
5. Wrap in Tauri (Windows + macOS).
6. Responsive tablet/iPad support.
7. Advanced printer + offline support (later).

---

## 11. First Version Scope (Definition of Done)

Login · roles/permissions · staff mgmt · restaurant settings · categories · menu items ·
inventory · 8 tables · waiter order creation · kitchen screen · admin/manager order view ·
invoice generation · tax & discount · receipt print · customer details · basic reports ·
Windows desktop app · browser/tablet responsive.

## 12. Out of Scope (Future)

Multi-branch · cloud backup · offline mode · sync · expenses · suppliers · purchase orders ·
barcode · kitchen printer · cash drawer · QR menu · delivery/online ordering · loyalty ·
WhatsApp invoices · advanced analytics · mobile notifications · auto-updater.
