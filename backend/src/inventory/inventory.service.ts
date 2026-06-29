import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, InventoryTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../socket/realtime.gateway';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { AdjustmentDto, StockInDto, StockOutDto } from './dto/stock-movement.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // ---- Items ----

  findAll(restaurantId: string, includeInactive = false) {
    return this.prisma.inventoryItem.findMany({
      where: { restaurantId, deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(restaurantId: string, id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return item;
  }

  async create(restaurantId: string, createdById: string, dto: CreateInventoryItemDto) {
    const opening = dto.currentStock ?? 0;
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          restaurantId,
          name: dto.name,
          unit: dto.unit,
          currentStock: opening,
          lowStockLimit: dto.lowStockLimit ?? 0,
          isActive: dto.isActive ?? true,
        },
      });
      // Opening balance is itself a stock movement → record it.
      if (opening > 0) {
        await tx.inventoryTransaction.create({
          data: {
            restaurantId,
            inventoryItemId: item.id,
            type: InventoryTransactionType.STOCK_IN,
            quantity: opening,
            previousStock: 0,
            newStock: opening,
            notes: 'Opening stock',
            createdById,
          },
        });
      }
      return item;
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateInventoryItemDto) {
    await this.findOne(restaurantId, id);
    return this.prisma.inventoryItem.update({ where: { id }, data: dto });
  }

  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    await this.prisma.inventoryItem.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }

  // ---- Stock movements (always recorded as a transaction) ----

  private async applyMovement(params: {
    restaurantId: string;
    inventoryItemId: string;
    type: InventoryTransactionType;
    delta: Prisma.Decimal; // signed
    createdById?: string;
    notes?: string;
    referenceType?: string;
    referenceId?: string;
  }) {
    const { restaurantId, inventoryItemId, type, delta, createdById, notes, referenceType, referenceId } =
      params;

    const result = await this.prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findFirst({
        where: { id: inventoryItemId, restaurantId, deletedAt: null },
      });
      if (!item) {
        throw new NotFoundException('Inventory item not found');
      }

      const previousStock = item.currentStock;
      const newStock = previousStock.add(delta);
      if (newStock.lessThan(0)) {
        throw new BadRequestException('Resulting stock cannot be negative');
      }

      const updated = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { currentStock: newStock },
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          restaurantId,
          inventoryItemId,
          type,
          quantity: delta.abs(),
          previousStock,
          newStock,
          notes,
          referenceType,
          referenceId,
          createdById,
        },
      });

      return { item: updated, transaction, isLowStock: newStock.lessThanOrEqualTo(item.lowStockLimit) };
    });

    // Real-time: stock changed, plus low-stock alert when crossing the threshold.
    this.realtime.toRestaurant(restaurantId, 'inventory.stock_updated', {
      itemId: result.item.id,
      currentStock: result.item.currentStock,
    });
    if (result.isLowStock) {
      this.realtime.toRestaurant(restaurantId, 'inventory.low_stock', {
        itemId: result.item.id,
        name: result.item.name,
        currentStock: result.item.currentStock,
        lowStockLimit: result.item.lowStockLimit,
      });
    }
    return result;
  }

  stockIn(restaurantId: string, createdById: string, dto: StockInDto) {
    return this.applyMovement({
      restaurantId,
      inventoryItemId: dto.inventoryItemId,
      type: (dto.type ?? 'STOCK_IN') as InventoryTransactionType,
      delta: new Prisma.Decimal(dto.quantity),
      createdById,
      notes: dto.notes,
    });
  }

  stockOut(restaurantId: string, createdById: string, dto: StockOutDto) {
    return this.applyMovement({
      restaurantId,
      inventoryItemId: dto.inventoryItemId,
      type: (dto.type ?? 'STOCK_OUT') as InventoryTransactionType,
      delta: new Prisma.Decimal(dto.quantity).negated(),
      createdById,
      notes: dto.notes,
    });
  }

  async adjustment(restaurantId: string, createdById: string, dto: AdjustmentDto) {
    const item = await this.findOne(restaurantId, dto.inventoryItemId);
    const delta = new Prisma.Decimal(dto.newStock).sub(item.currentStock);
    return this.applyMovement({
      restaurantId,
      inventoryItemId: dto.inventoryItemId,
      type: InventoryTransactionType.ADJUSTMENT,
      delta,
      createdById,
      notes: dto.notes ?? 'Manual adjustment',
    });
  }

  // ---- Reads ----

  transactions(restaurantId: string, opts: { inventoryItemId?: string; limit?: number } = {}) {
    return this.prisma.inventoryTransaction.findMany({
      where: { restaurantId, ...(opts.inventoryItemId ? { inventoryItemId: opts.inventoryItemId } : {}) },
      include: { inventoryItem: { select: { id: true, name: true, unit: true } } },
      orderBy: { createdAt: 'desc' },
      take: opts.limit ?? 100,
    });
  }

  async lowStock(restaurantId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { restaurantId, deletedAt: null, isActive: true },
      orderBy: { name: 'asc' },
    });
    // currentStock <= lowStockLimit (column-to-column comparison done in app).
    return items.filter((i) => i.currentStock.lessThanOrEqualTo(i.lowStockLimit));
  }
}
