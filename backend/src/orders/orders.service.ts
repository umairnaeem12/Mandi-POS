import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../socket/realtime.gateway';
import { ActivitiesService } from '../activities/activities.service';
import {
  AddItemDto,
  CreateOrderDto,
  OrderItemInputDto,
  UpdateItemDto,
  UpdateOrderDto,
} from './dto/order.dto';

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'PREPARING', 'SERVED'];

const orderInclude = {
  items: true,
  table: { select: { id: true, name: true, tableNumber: true } },
  customer: { select: { id: true, name: true, contactNumber: true } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly activities: ActivitiesService,
  ) {}

  private async nextOrderNumber(tx: Prisma.TransactionClient, restaurantId: string): Promise<string> {
    const count = await tx.order.count({ where: { restaurantId } });
    return `ORD-${String(count + 1).padStart(6, '0')}`;
  }

  // Build snapshot line items from menu items (name + price frozen at order time).
  private async buildItems(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    inputs: OrderItemInputDto[],
  ) {
    const ids = inputs.map((i) => i.menuItemId);
    const menuItems = await tx.menuItem.findMany({
      where: { id: { in: ids }, restaurantId, deletedAt: null },
    });
    const byId = new Map(menuItems.map((m) => [m.id, m]));

    return inputs.map((input) => {
      const menuItem = byId.get(input.menuItemId);
      if (!menuItem) {
        throw new BadRequestException(`Menu item not found: ${input.menuItemId}`);
      }
      if (!menuItem.isAvailable || menuItem.isOutOfStock) {
        throw new BadRequestException(`Item not available: ${menuItem.name}`);
      }
      const unitPrice = menuItem.price;
      return {
        menuItemId: menuItem.id,
        itemName: menuItem.name,
        itemNameAr: menuItem.nameAr,
        quantity: input.quantity,
        unitPrice,
        totalPrice: unitPrice.mul(input.quantity),
        notes: input.notes,
      };
    });
  }

  private async recomputeTotals(tx: Prisma.TransactionClient, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    const subtotal = items.reduce((acc, i) => acc.add(i.totalPrice), new Prisma.Decimal(0));
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    // Discount/tax are applied at billing (PH7); grandTotal mirrors subtotal until then.
    const grandTotal = subtotal.sub(order.discountAmount).add(order.taxAmount);
    return tx.order.update({
      where: { id: orderId },
      data: { subtotal, grandTotal },
    });
  }

  async create(restaurantId: string, userId: string, dto: CreateOrderDto) {
    if (dto.orderType === 'DINE_IN' && !dto.tableId) {
      throw new BadRequestException('tableId is required for dine-in orders');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      if (dto.tableId) {
        const table = await tx.restaurantTable.findFirst({
          where: { id: dto.tableId, restaurantId },
        });
        if (!table) {
          throw new BadRequestException('Invalid tableId');
        }
        // One active dine-in order per table.
        const active = await tx.order.findFirst({
          where: { tableId: dto.tableId, status: { in: ACTIVE_ORDER_STATUSES } },
        });
        if (active) {
          throw new ConflictException('This table already has an active order');
        }
      }

      const items = await this.buildItems(tx, restaurantId, dto.items);
      const subtotal = items.reduce((acc, i) => acc.add(i.totalPrice), new Prisma.Decimal(0));
      const orderNumber = await this.nextOrderNumber(tx, restaurantId);

      const created = await tx.order.create({
        data: {
          restaurantId,
          orderNumber,
          orderType: dto.orderType,
          tableId: dto.tableId,
          customerId: dto.customerId,
          status: 'PENDING',
          subtotal,
          grandTotal: subtotal,
          createdById: userId,
          items: { create: items },
          statusLogs: { create: { status: 'PENDING', changedById: userId, note: 'Order created' } },
        },
        include: orderInclude,
      });

      if (dto.tableId) {
        await tx.restaurantTable.update({ where: { id: dto.tableId }, data: { status: 'OCCUPIED' } });
      }
      return created;
    });

    void this.activities.log({
      restaurantId,
      userId,
      action: 'order.created',
      module: 'orders',
      description: `Order ${order.orderNumber} created${order.table ? ` for ${order.table.name}` : ''}`,
    });

    // Real-time fan-out.
    this.realtime.toRestaurant(restaurantId, 'order.created', order);
    this.realtime.toKitchen(restaurantId, 'kitchen.new_order', order);
    if (order.tableId) {
      this.realtime.toRestaurant(restaurantId, 'table.status_changed', {
        tableId: order.tableId,
        status: 'OCCUPIED',
      });
      this.realtime.toTable(order.tableId, 'table.order_created', order);
    }
    return order;
  }

  findAll(
    restaurantId: string,
    filters: { status?: OrderStatus; tableId?: string; active?: boolean } = {},
  ) {
    const where: Prisma.OrderWhereInput = {
      restaurantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.tableId ? { tableId: filters.tableId } : {}),
      ...(filters.active ? { status: { in: ACTIVE_ORDER_STATUSES } } : {}),
    };
    return this.prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(restaurantId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      include: { ...orderInclude, statusLogs: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  private assertEditable(status: OrderStatus) {
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      throw new BadRequestException('This order can no longer be edited');
    }
  }

  async update(restaurantId: string, id: string, dto: UpdateOrderDto) {
    const order = await this.findOne(restaurantId, id);
    this.assertEditable(order.status);
    const updated = await this.prisma.order.update({
      where: { id },
      data: { customerId: dto.customerId, tableId: dto.tableId },
      include: orderInclude,
    });
    this.realtime.toRestaurant(restaurantId, 'order.updated', updated);
    return updated;
  }

  async addItem(restaurantId: string, id: string, dto: AddItemDto) {
    const order = await this.findOne(restaurantId, id);
    this.assertEditable(order.status);
    const updated = await this.prisma.$transaction(async (tx) => {
      const [item] = await this.buildItems(tx, restaurantId, [dto]);
      await tx.orderItem.create({ data: { orderId: id, ...item } });
      await this.recomputeTotals(tx, id);
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });
    this.realtime.toRestaurant(restaurantId, 'order.updated', updated);
    this.realtime.toKitchen(restaurantId, 'kitchen.order_updated', updated);
    return updated;
  }

  async updateItem(restaurantId: string, id: string, itemId: string, dto: UpdateItemDto) {
    const order = await this.findOne(restaurantId, id);
    this.assertEditable(order.status);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({ where: { id: itemId, orderId: id } });
      if (!item) {
        throw new NotFoundException('Order item not found');
      }
      const quantity = dto.quantity ?? item.quantity;
      await tx.orderItem.update({
        where: { id: itemId },
        data: {
          quantity,
          notes: dto.notes ?? item.notes,
          totalPrice: item.unitPrice.mul(quantity),
        },
      });
      await this.recomputeTotals(tx, id);
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });
    this.realtime.toRestaurant(restaurantId, 'order.updated', updated);
    this.realtime.toKitchen(restaurantId, 'kitchen.order_updated', updated);
    return updated;
  }

  async removeItem(restaurantId: string, id: string, itemId: string) {
    const order = await this.findOne(restaurantId, id);
    this.assertEditable(order.status);
    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findFirst({ where: { id: itemId, orderId: id } });
      if (!item) {
        throw new NotFoundException('Order item not found');
      }
      const remaining = await tx.orderItem.count({ where: { orderId: id } });
      if (remaining <= 1) {
        throw new BadRequestException('An order must have at least one item');
      }
      await tx.orderItem.delete({ where: { id: itemId } });
      await this.recomputeTotals(tx, id);
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });
    this.realtime.toRestaurant(restaurantId, 'order.updated', updated);
    this.realtime.toKitchen(restaurantId, 'kitchen.order_updated', updated);
    return updated;
  }

  async setStatus(restaurantId: string, id: string, status: OrderStatus, userId: string) {
    const order = await this.findOne(restaurantId, id);
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Order is already finalized');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: Prisma.OrderUpdateInput = { status };
      if (status === 'SERVED') data.servedById = userId;
      if (status === 'COMPLETED') {
        data.completedById = userId;
        data.completedAt = new Date();
      }
      const o = await tx.order.update({ where: { id }, data, include: orderInclude });
      await tx.orderStatusLog.create({ data: { orderId: id, status, changedById: userId } });

      // Free the table when the order completes.
      if (status === 'COMPLETED' && o.tableId) {
        await tx.restaurantTable.update({ where: { id: o.tableId }, data: { status: 'AVAILABLE' } });
      }
      return o;
    });

    this.realtime.toRestaurant(restaurantId, 'order.status_changed', { id, status });
    this.realtime.toKitchen(restaurantId, 'kitchen.order_status_changed', { id, status });
    if (updated.tableId) {
      this.realtime.toTable(updated.tableId, 'order.status_changed', { id, status });
      if (status === 'COMPLETED') {
        this.realtime.toRestaurant(restaurantId, 'table.status_changed', {
          tableId: updated.tableId,
          status: 'AVAILABLE',
        });
      }
    }
    return updated;
  }

  async cancel(restaurantId: string, id: string, reason: string, userId: string) {
    const order = await this.findOne(restaurantId, id);
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Order is already finalized');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledById: userId, cancelReason: reason },
        include: orderInclude,
      });
      await tx.orderStatusLog.create({
        data: { orderId: id, status: 'CANCELLED', changedById: userId, note: reason },
      });
      if (o.tableId) {
        await tx.restaurantTable.update({ where: { id: o.tableId }, data: { status: 'AVAILABLE' } });
      }
      return o;
    });

    void this.activities.log({
      restaurantId,
      userId,
      action: 'order.cancelled',
      module: 'orders',
      description: `Order ${updated.orderNumber} cancelled: ${reason}`,
    });
    this.realtime.toRestaurant(restaurantId, 'order.cancelled', updated);
    this.realtime.toKitchen(restaurantId, 'kitchen.order_status_changed', { id, status: 'CANCELLED' });
    if (updated.tableId) {
      this.realtime.toRestaurant(restaurantId, 'table.status_changed', {
        tableId: updated.tableId,
        status: 'AVAILABLE',
      });
    }
    return updated;
  }

  activeForTable(restaurantId: string, tableId: string) {
    return this.prisma.order.findFirst({
      where: { restaurantId, tableId, status: { in: ACTIVE_ORDER_STATUSES } },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
}
