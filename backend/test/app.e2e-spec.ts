import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './setup-app';

// Runs against an isolated test DB (see test:e2e script). Seed provides:
// admin/admin123, roles incl. Waiter, Zinger Burger @450, 8 tables.
describe('Restaurant POS (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let adminToken: string;

  const login = async (identifier: string, password: string) =>
    request(app.getHttpServer()).post('/api/auth/login').send({ identifier, password });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
    const res = await login('admin', 'admin123');
    adminToken = res.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ---- Validation ----
  describe('Validation', () => {
    it('rejects login with missing fields (400)', async () => {
      const res = await http.post('/api/auth/login').send({ identifier: 'admin' });
      expect(res.status).toBe(400);
    });

    it('rejects wrong password (401)', async () => {
      const res = await login('admin', 'nope');
      expect(res.status).toBe(401);
    });

    it('strips/forbids unknown fields', async () => {
      const res = await http
        .post('/api/auth/login')
        .send({ identifier: 'admin', password: 'admin123', hacker: true });
      expect(res.status).toBe(400);
    });

    it('logs in admin and returns permissions', async () => {
      const res = await http.get('/api/auth/me').set(auth(adminToken));
      expect(res.status).toBe(200);
      expect(res.body.data.permissions).toContain('manage_staff');
    });

    it('blocks protected route without token (401)', async () => {
      const res = await http.get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ---- RBAC ----
  describe('Role-based access control', () => {
    let waiterToken: string;
    let waiterId: string;

    beforeAll(async () => {
      const roles = (await http.get('/api/roles').set(auth(adminToken))).body.data;
      const waiterRole = roles.find((r: { name: string }) => r.name === 'Waiter');
      const created = await http
        .post('/api/staff')
        .set(auth(adminToken))
        .send({
          fullName: 'Test Waiter',
          email: 'testwaiter@e2e.local',
          username: 'testwaiter',
          password: 'pass123',
          roleId: waiterRole.id,
        });
      waiterId = created.body.data.id;
      waiterToken = (await login('testwaiter', 'pass123')).body.data.accessToken;
    });

    afterAll(async () => {
      await http.delete(`/api/staff/${waiterId}`).set(auth(adminToken));
    });

    it('waiter is forbidden from /staff (403)', async () => {
      const res = await http.get('/api/staff').set(auth(waiterToken));
      expect(res.status).toBe(403);
    });

    it('waiter can read orders (has view_orders via create flow)', async () => {
      const res = await http.get('/api/orders').set(auth(waiterToken));
      expect(res.status).toBe(200);
    });

    it('deactivated staff token is rejected immediately', async () => {
      await http.patch(`/api/staff/${waiterId}/status`).set(auth(adminToken)).send({ status: 'INACTIVE' });
      const res = await http.get('/api/orders').set(auth(waiterToken));
      expect(res.status).toBe(401);
      await http.patch(`/api/staff/${waiterId}/status`).set(auth(adminToken)).send({ status: 'ACTIVE' });
    });
  });

  // ---- Invoice calculation ----
  describe('Invoice calculation', () => {
    it('computes discount-before-tax and completes order on full payment', async () => {
      const tables = (await http.get('/api/tables').set(auth(adminToken))).body.data;
      const table = tables.find((t: { tableNumber: number }) => t.tableNumber === 1);
      const menu = (await http.get('/api/menu-items').set(auth(adminToken))).body.data;
      const zinger = menu.find((m: { name: string }) => m.name === 'Zinger Burger');

      const order = (
        await http
          .post('/api/orders')
          .set(auth(adminToken))
          .send({ orderType: 'DINE_IN', tableId: table.id, items: [{ menuItemId: zinger.id, quantity: 2 }] })
      ).body.data;
      expect(Number(order.subtotal)).toBe(900);

      const invoice = (
        await http
          .post(`/api/invoices/from-order/${order.id}`)
          .set(auth(adminToken))
          .send({ discountType: 'PERCENTAGE', discountValue: 10 })
      ).body.data;

      // 900 - 10% (90) = 810 taxable; +15% tax (121.5) = 931.5
      expect(Number(invoice.discountAmount)).toBe(90);
      expect(Number(invoice.taxAmount)).toBeCloseTo(121.5, 2);
      expect(Number(invoice.grandTotal)).toBeCloseTo(931.5, 2);
      expect(invoice.paymentStatus).toBe('UNPAID');

      const paid = (
        await http
          .post(`/api/invoices/${invoice.id}/pay`)
          .set(auth(adminToken))
          .send({ paymentMethod: 'CASH', amount: 1000 })
      ).body.data;
      expect(paid.paymentStatus).toBe('PAID');
      expect(Number(paid.changeAmount)).toBeCloseTo(68.5, 2);

      const completedOrder = (await http.get(`/api/orders/${order.id}`).set(auth(adminToken))).body.data;
      expect(completedOrder.status).toBe('COMPLETED');

      const tableAfter = (await http.get(`/api/tables/${table.id}`).set(auth(adminToken))).body.data;
      expect(tableAfter.status).toBe('AVAILABLE');
    });

    it('rejects a second invoice for the same order', async () => {
      const tables = (await http.get('/api/tables').set(auth(adminToken))).body.data;
      const table = tables.find((t: { tableNumber: number }) => t.tableNumber === 3);
      const menu = (await http.get('/api/menu-items').set(auth(adminToken))).body.data;
      const order = (
        await http
          .post('/api/orders')
          .set(auth(adminToken))
          .send({ orderType: 'DINE_IN', tableId: table.id, items: [{ menuItemId: menu[0].id, quantity: 1 }] })
      ).body.data;
      await http.post(`/api/invoices/from-order/${order.id}`).set(auth(adminToken)).send({});
      const dup = await http.post(`/api/invoices/from-order/${order.id}`).set(auth(adminToken)).send({});
      expect(dup.status).toBe(409);
      await http.post(`/api/orders/${order.id}/cancel`).set(auth(adminToken)).send({ reason: 'cleanup' });
    });
  });

  // ---- Inventory transactions ----
  describe('Inventory transactions', () => {
    let itemId: string;

    it('opening stock creates a STOCK_IN transaction', async () => {
      const item = (
        await http
          .post('/api/inventory/items')
          .set(auth(adminToken))
          .send({ name: 'E2E Patty', unit: 'PIECE', currentStock: 100, lowStockLimit: 20 })
      ).body.data;
      itemId = item.id;
      const txns = (
        await http.get(`/api/inventory/transactions?inventoryItemId=${itemId}`).set(auth(adminToken))
      ).body.data;
      expect(txns).toHaveLength(1);
      expect(txns[0].type).toBe('STOCK_IN');
      expect(Number(txns[0].newStock)).toBe(100);
    });

    it('stock-out updates balance and records previous/new', async () => {
      const res = (
        await http
          .post('/api/inventory/stock-out')
          .set(auth(adminToken))
          .send({ inventoryItemId: itemId, quantity: 30 })
      ).body.data;
      expect(Number(res.item.currentStock)).toBe(70);
      expect(Number(res.transaction.previousStock)).toBe(100);
      expect(Number(res.transaction.newStock)).toBe(70);
    });

    it('rejects stock-out that would go negative', async () => {
      const res = await http
        .post('/api/inventory/stock-out')
        .set(auth(adminToken))
        .send({ inventoryItemId: itemId, quantity: 1000 });
      expect(res.status).toBe(400);
    });

    it('adjustment to below limit surfaces in low-stock', async () => {
      await http.post('/api/inventory/adjustment').set(auth(adminToken)).send({ inventoryItemId: itemId, newStock: 10 });
      const low = (await http.get('/api/inventory/low-stock').set(auth(adminToken))).body.data;
      expect(low.some((i: { id: string }) => i.id === itemId)).toBe(true);
    });

    afterAll(async () => {
      await http.delete(`/api/inventory/items/${itemId}`).set(auth(adminToken));
    });
  });

  // ---- Order lifecycle ----
  describe('Order lifecycle', () => {
    it('enforces one active order per table and status transitions', async () => {
      const tables = (await http.get('/api/tables').set(auth(adminToken))).body.data;
      const table = tables.find((t: { tableNumber: number }) => t.tableNumber === 5);
      const menu = (await http.get('/api/menu-items').set(auth(adminToken))).body.data;

      const order = (
        await http
          .post('/api/orders')
          .set(auth(adminToken))
          .send({ orderType: 'DINE_IN', tableId: table.id, items: [{ menuItemId: menu[0].id, quantity: 1 }] })
      ).body.data;

      const second = await http
        .post('/api/orders')
        .set(auth(adminToken))
        .send({ orderType: 'DINE_IN', tableId: table.id, items: [{ menuItemId: menu[0].id, quantity: 1 }] });
      expect(second.status).toBe(409);

      await http.patch(`/api/orders/${order.id}/status`).set(auth(adminToken)).send({ status: 'PREPARING' });
      const served = await http
        .patch(`/api/orders/${order.id}/status`)
        .set(auth(adminToken))
        .send({ status: 'SERVED' });
      expect(served.body.data.status).toBe('SERVED');

      const cancelled = await http
        .post(`/api/orders/${order.id}/cancel`)
        .set(auth(adminToken))
        .send({ reason: 'e2e test' });
      expect(cancelled.body.data.status).toBe('CANCELLED');
      expect(cancelled.body.data.cancelReason).toBe('e2e test');
    });

    it('requires a table for dine-in orders', async () => {
      const menu = (await http.get('/api/menu-items').set(auth(adminToken))).body.data;
      const res = await http
        .post('/api/orders')
        .set(auth(adminToken))
        .send({ orderType: 'DINE_IN', items: [{ menuItemId: menu[0].id, quantity: 1 }] });
      expect(res.status).toBe(400);
    });
  });
});
