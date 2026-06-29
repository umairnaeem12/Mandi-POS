import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../socket/realtime.gateway';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';

const ACTIVE_STATUSES: TableStatus[] = ['OCCUPIED', 'RESERVED', 'CLEANING'];

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // Each table with its current active order summary (for the table grid).
  async findAll(restaurantId: string) {
    const tables = await this.prisma.restaurantTable.findMany({
      where: { restaurantId },
      orderBy: { tableNumber: 'asc' },
      include: {
        orders: {
          where: { status: { in: ['PENDING', 'PREPARING', 'SERVED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true },
        },
      },
    });
    return tables.map(({ orders, ...t }) => ({ ...t, activeOrder: orders[0] ?? null }));
  }

  async findOne(restaurantId: string, id: string) {
    const table = await this.prisma.restaurantTable.findFirst({ where: { id, restaurantId } });
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return table;
  }

  async create(restaurantId: string, dto: CreateTableDto) {
    const clash = await this.prisma.restaurantTable.findFirst({
      where: { restaurantId, tableNumber: dto.tableNumber },
    });
    if (clash) {
      throw new ConflictException('A table with this number already exists');
    }
    return this.prisma.restaurantTable.create({
      data: {
        restaurantId,
        name: dto.name,
        tableNumber: dto.tableNumber,
        capacity: dto.capacity ?? 4,
      },
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateTableDto) {
    await this.findOne(restaurantId, id);
    return this.prisma.restaurantTable.update({ where: { id }, data: dto });
  }

  async setStatus(restaurantId: string, id: string, status: TableStatus) {
    await this.findOne(restaurantId, id);
    const table = await this.prisma.restaurantTable.update({ where: { id }, data: { status } });
    this.realtime.toRestaurant(restaurantId, 'table.status_changed', {
      tableId: id,
      status,
    });
    return table;
  }

  async currentOrder(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    return this.prisma.order.findFirst({
      where: { restaurantId, tableId: id, status: { in: ['PENDING', 'PREPARING', 'SERVED'] } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(restaurantId: string, id: string) {
    const table = await this.findOne(restaurantId, id);
    if (ACTIVE_STATUSES.includes(table.status)) {
      throw new ConflictException('Cannot delete a table that is currently in use');
    }
    await this.prisma.restaurantTable.delete({ where: { id } });
    return { success: true };
  }
}
