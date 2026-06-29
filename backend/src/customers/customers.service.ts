import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // Customer with aggregated history (derived from invoices/orders, per spec).
  private async withStats(restaurantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, restaurantId } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    const agg = await this.prisma.invoice.aggregate({
      where: { restaurantId, customerId: id, paymentStatus: 'PAID' },
      _count: true,
      _sum: { grandTotal: true },
      _max: { createdAt: true },
    });
    return {
      ...customer,
      totalOrders: agg._count,
      totalSpent: agg._sum.grandTotal ?? new Prisma.Decimal(0),
      lastOrderAt: agg._max.createdAt,
    };
  }

  findAll(restaurantId: string) {
    return this.prisma.customer.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  search(restaurantId: string, term: string) {
    return this.prisma.customer.findMany({
      where: {
        restaurantId,
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { contactNumber: { contains: term } },
        ],
      },
      take: 50,
    });
  }

  findOne(restaurantId: string, id: string) {
    return this.withStats(restaurantId, id);
  }

  async orders(restaurantId: string, id: string) {
    await this.withStats(restaurantId, id);
    return this.prisma.order.findMany({
      where: { restaurantId, customerId: id },
      include: { items: true, invoice: { select: { invoiceNumber: true, paymentStatus: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertContactFree(restaurantId: string, contactNumber?: string, exceptId?: string) {
    if (!contactNumber) return;
    const clash = await this.prisma.customer.findFirst({
      where: { restaurantId, contactNumber, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    if (clash) {
      throw new ConflictException('A customer with this contact number already exists');
    }
  }

  async create(restaurantId: string, dto: CreateCustomerDto) {
    await this.assertContactFree(restaurantId, dto.contactNumber);
    return this.prisma.customer.create({ data: { restaurantId, ...dto } });
  }

  async update(restaurantId: string, id: string, dto: UpdateCustomerDto) {
    await this.withStats(restaurantId, id);
    await this.assertContactFree(restaurantId, dto.contactNumber, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async remove(restaurantId: string, id: string) {
    await this.withStats(restaurantId, id);
    await this.prisma.customer.delete({ where: { id } });
    return { success: true };
  }
}
