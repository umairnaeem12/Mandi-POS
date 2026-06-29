import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../socket/realtime.gateway';
import { ActivitiesService } from '../activities/activities.service';
import { CreateInvoiceDto, PayInvoiceDto } from './dto/invoice.dto';

const invoiceInclude = {
  items: true,
  payments: true,
  order: { select: { id: true, orderNumber: true, table: { select: { name: true, tableNumber: true } } } },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly activities: ActivitiesService,
  ) {}

  private async nextInvoiceNumber(
    tx: Prisma.TransactionClient,
    restaurantId: string,
    prefix: string,
  ): Promise<string> {
    const count = await tx.invoice.count({ where: { restaurantId } });
    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }

  async generateFromOrder(restaurantId: string, userId: string, orderId: string, dto: CreateInvoiceDto) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { items: true, invoice: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot invoice a cancelled order');
    }
    if (order.invoice) {
      throw new ConflictException('An invoice already exists for this order');
    }
    if (order.items.length === 0) {
      throw new BadRequestException('Order has no items');
    }

    const restaurant = await this.prisma.restaurant.findUniqueOrThrow({
      where: { id: restaurantId },
      include: { settings: true },
    });
    const settings = restaurant.settings!;

    // ---- Totals: discount before tax ----
    const subtotal = order.items.reduce((acc, i) => acc.add(i.totalPrice), new Prisma.Decimal(0));

    let discountAmount = new Prisma.Decimal(0);
    const discountValue = new Prisma.Decimal(dto.discountValue ?? 0);
    if (dto.discountType === 'PERCENTAGE') {
      discountAmount = subtotal.mul(discountValue).div(100);
    } else if (dto.discountType === 'FIXED') {
      discountAmount = discountValue;
    }
    if (discountAmount.greaterThan(subtotal)) {
      discountAmount = subtotal; // never discount below zero
    }

    const taxable = subtotal.sub(discountAmount);
    const taxPercentage = settings.isTaxEnabled ? settings.taxPercentage : new Prisma.Decimal(0);
    const taxAmount = taxable.mul(taxPercentage).div(100);
    const grandTotal = taxable.add(taxAmount);

    const invoice = await this.prisma.$transaction(async (tx) => {
      // Create customer during billing if a name was given without an id.
      let customerId = dto.customerId;
      if (!customerId && dto.customerName) {
        const customer = await tx.customer.create({
          data: { restaurantId, name: dto.customerName, contactNumber: dto.customerContact },
        });
        customerId = customer.id;
      }

      const invoiceNumber = await this.nextInvoiceNumber(tx, restaurantId, settings.invoicePrefix);

      const created = await tx.invoice.create({
        data: {
          restaurantId,
          orderId,
          customerId,
          invoiceNumber,
          customerName: dto.customerName,
          customerContact: dto.customerContact,
          restaurantName: restaurant.name,
          restaurantAddress: restaurant.address,
          restaurantContact: restaurant.contactNumber,
          restaurantLogoUrl: restaurant.logoUrl,
          currencySymbol: settings.currencySymbol,
          subtotal,
          discountType: dto.discountType,
          discountValue,
          discountAmount,
          taxName: settings.taxName,
          taxPercentage,
          taxAmount,
          grandTotal,
          paymentStatus: 'UNPAID',
          createdById: userId,
          items: {
            create: order.items.map((i) => ({
              menuItemId: i.menuItemId,
              itemName: i.itemName,
              itemNameAr: i.itemNameAr,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
            })),
          },
        },
        include: invoiceInclude,
      });

      // Mirror final totals back onto the order.
      await tx.order.update({
        where: { id: orderId },
        data: { discountAmount, taxAmount, grandTotal, customerId },
      });

      return created;
    });

    void this.activities.log({
      restaurantId,
      userId,
      action: 'invoice.generated',
      module: 'invoices',
      description: `Invoice ${invoice.invoiceNumber} generated (${invoice.currencySymbol} ${invoice.grandTotal})`,
    });
    this.realtime.toRestaurant(restaurantId, 'invoice.created', invoice);
    return invoice;
  }

  async pay(restaurantId: string, userId: string, invoiceId: string, dto: PayInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, restaurantId },
      include: { order: true },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.paymentStatus === 'PAID' || invoice.paymentStatus === 'REFUNDED') {
      throw new BadRequestException('Invoice is already settled');
    }

    const amount = new Prisma.Decimal(dto.amount);
    const newPaid = invoice.paidAmount.add(amount);
    const fullyPaid = newPaid.greaterThanOrEqualTo(invoice.grandTotal);
    const changeAmount = fullyPaid ? newPaid.sub(invoice.grandTotal) : new Prisma.Decimal(0);
    const paymentStatus: PaymentStatus = fullyPaid
      ? 'PAID'
      : newPaid.greaterThan(0)
        ? 'PARTIAL'
        : 'UNPAID';

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          restaurantId,
          invoiceId,
          paymentMethod: dto.paymentMethod as PaymentMethod,
          amount,
          referenceNumber: dto.referenceNumber,
          receivedById: userId,
        },
      });

      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount: newPaid, changeAmount, paymentStatus },
        include: invoiceInclude,
      });

      // On full payment: complete order + free table (spec §19 transaction).
      if (fullyPaid && invoice.order) {
        await tx.order.update({
          where: { id: invoice.orderId },
          data: { status: 'COMPLETED', completedById: userId, completedAt: new Date() },
        });
        await tx.orderStatusLog.create({
          data: { orderId: invoice.orderId, status: 'COMPLETED', changedById: userId, note: 'Paid' },
        });
        if (invoice.order.tableId) {
          await tx.restaurantTable.update({
            where: { id: invoice.order.tableId },
            data: { status: 'AVAILABLE' },
          });
        }
      }
      return updated;
    });

    void this.activities.log({
      restaurantId,
      userId,
      action: 'payment.received',
      module: 'invoices',
      description: `Payment ${invoice.currencySymbol} ${dto.amount} received for ${result.invoiceNumber} (${dto.paymentMethod})`,
    });
    this.realtime.toRestaurant(restaurantId, 'invoice.paid', result);
    if (fullyPaid && invoice.order) {
      this.realtime.toRestaurant(restaurantId, 'order.completed', { id: invoice.orderId });
      this.realtime.toRestaurant(restaurantId, 'order.status_changed', {
        id: invoice.orderId,
        status: 'COMPLETED',
      });
      if (invoice.order.tableId) {
        this.realtime.toRestaurant(restaurantId, 'table.status_changed', {
          tableId: invoice.order.tableId,
          status: 'AVAILABLE',
        });
      }
    }
    return result;
  }

  findAll(restaurantId: string) {
    return this.prisma.invoice.findMany({
      where: { restaurantId },
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findOne(restaurantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, restaurantId },
      include: invoiceInclude,
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async markPrinted(restaurantId: string, id: string) {
    const invoice = await this.findOne(restaurantId, id);
    this.realtime.toRestaurant(restaurantId, 'invoice.printed', { id });
    return invoice;
  }

  search(
    restaurantId: string,
    f: {
      invoiceNumber?: string;
      customerName?: string;
      customerContact?: string;
      paymentStatus?: PaymentStatus;
      paymentMethod?: PaymentMethod;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const where: Prisma.InvoiceWhereInput = {
      restaurantId,
      ...(f.invoiceNumber ? { invoiceNumber: { contains: f.invoiceNumber, mode: 'insensitive' } } : {}),
      ...(f.customerName ? { customerName: { contains: f.customerName, mode: 'insensitive' } } : {}),
      ...(f.customerContact ? { customerContact: { contains: f.customerContact } } : {}),
      ...(f.paymentStatus ? { paymentStatus: f.paymentStatus } : {}),
      ...(f.paymentMethod ? { payments: { some: { paymentMethod: f.paymentMethod } } } : {}),
      ...(f.dateFrom || f.dateTo
        ? {
            createdAt: {
              ...(f.dateFrom ? { gte: new Date(f.dateFrom) } : {}),
              ...(f.dateTo ? { lte: new Date(f.dateTo) } : {}),
            },
          }
        : {}),
    };
    return this.prisma.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
