import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, PayInvoiceDto } from './dto/invoice.dto';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { AuthUser, CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @RequirePermissions('search_invoices')
  findAll(@CurrentUser('restaurantId') restaurantId: string) {
    return this.invoices.findAll(restaurantId);
  }

  // Must be declared before ':id' so "search" isn't treated as an id.
  @Get('search')
  @RequirePermissions('search_invoices')
  search(
    @CurrentUser('restaurantId') restaurantId: string,
    @Query('invoiceNumber') invoiceNumber?: string,
    @Query('customerName') customerName?: string,
    @Query('customerContact') customerContact?: string,
    @Query('paymentStatus') paymentStatus?: PaymentStatus,
    @Query('paymentMethod') paymentMethod?: PaymentMethod,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.invoices.search(restaurantId, {
      invoiceNumber,
      customerName,
      customerContact,
      paymentStatus,
      paymentMethod,
      dateFrom,
      dateTo,
    });
  }

  @Get(':id')
  @RequirePermissions('search_invoices')
  findOne(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.invoices.findOne(restaurantId, id);
  }

  @Post('from-order/:orderId')
  @RequirePermissions('generate_invoice')
  generate(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoices.generateFromOrder(user.restaurantId, user.id, orderId, dto);
  }

  @Post(':id/pay')
  @RequirePermissions('receive_payment')
  pay(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PayInvoiceDto) {
    return this.invoices.pay(user.restaurantId, user.id, id, dto);
  }

  @Post(':id/print')
  @RequirePermissions('print_receipt')
  print(@CurrentUser('restaurantId') restaurantId: string, @Param('id') id: string) {
    return this.invoices.markPrinted(restaurantId, id);
  }
}
