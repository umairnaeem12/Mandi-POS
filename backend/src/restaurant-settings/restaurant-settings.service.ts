import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class RestaurantSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Merged restaurant + settings view consumed by the settings page, receipts, tax calc.
  async get(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { settings: true },
    });
    if (!restaurant || !restaurant.settings) {
      throw new NotFoundException('Restaurant settings not found');
    }
    const { settings } = restaurant;
    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      logoUrl: restaurant.logoUrl,
      address: restaurant.address,
      contactNumber: restaurant.contactNumber,
      email: restaurant.email,
      currencyCode: settings.currencyCode,
      currencySymbol: settings.currencySymbol,
      taxName: settings.taxName,
      taxPercentage: Number(settings.taxPercentage),
      isTaxEnabled: settings.isTaxEnabled,
      receiptHeader: settings.receiptHeader,
      receiptFooter: settings.receiptFooter,
      invoicePrefix: settings.invoicePrefix,
    };
  }

  async update(restaurantId: string, dto: UpdateSettingsDto) {
    await this.prisma.$transaction([
      this.prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          name: dto.restaurantName,
          address: dto.address,
          contactNumber: dto.contactNumber,
          email: dto.email,
        },
      }),
      this.prisma.restaurantSettings.update({
        where: { restaurantId },
        data: {
          currencyCode: dto.currencyCode,
          currencySymbol: dto.currencySymbol,
          taxName: dto.taxName,
          taxPercentage: dto.taxPercentage,
          isTaxEnabled: dto.isTaxEnabled,
          receiptHeader: dto.receiptHeader,
          receiptFooter: dto.receiptFooter,
          invoicePrefix: dto.invoicePrefix,
        },
      }),
    ]);
    return this.get(restaurantId);
  }

  async updateLogo(restaurantId: string, logoUrl: string) {
    await this.prisma.restaurant.update({ where: { id: restaurantId }, data: { logoUrl } });
    return this.get(restaurantId);
  }
}
