import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCategory(restaurantId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, restaurantId, deletedAt: null },
    });
    if (!category) {
      throw new BadRequestException('Invalid categoryId');
    }
  }

  findAll(restaurantId: string, opts: { categoryId?: string; availableOnly?: boolean } = {}) {
    const where: Prisma.MenuItemWhereInput = {
      restaurantId,
      deletedAt: null,
      ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
      ...(opts.availableOnly ? { isAvailable: true, isOutOfStock: false } : {}),
    };
    return this.prisma.menuItem.findMany({
      where,
      include: { category: { select: { id: true, name: true, nameAr: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(restaurantId: string, id: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, restaurantId, deletedAt: null },
      include: { category: { select: { id: true, name: true } }, images: true },
    });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return item;
  }

  async create(restaurantId: string, dto: CreateMenuItemDto) {
    await this.assertCategory(restaurantId, dto.categoryId);
    return this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId: dto.categoryId,
        name: dto.name,
        nameAr: dto.nameAr,
        description: dto.description,
        price: dto.price,
        imageUrl: dto.imageUrl,
        isAvailable: dto.isAvailable ?? true,
        isOutOfStock: dto.isOutOfStock ?? false,
        preparationTimeMinutes: dto.preparationTimeMinutes,
        sortOrder: dto.sortOrder ?? 0,
      },
      include: { category: { select: { id: true, name: true, nameAr: true } } },
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateMenuItemDto) {
    await this.findOne(restaurantId, id);
    if (dto.categoryId) {
      await this.assertCategory(restaurantId, dto.categoryId);
    }
    return this.prisma.menuItem.update({
      where: { id },
      data: dto,
      include: { category: { select: { id: true, name: true, nameAr: true } } },
    });
  }

  async setAvailability(
    restaurantId: string,
    id: string,
    status: 'AVAILABLE' | 'OUT_OF_STOCK' | 'INACTIVE',
  ) {
    await this.findOne(restaurantId, id);
    const data =
      status === 'AVAILABLE'
        ? { isAvailable: true, isOutOfStock: false }
        : status === 'OUT_OF_STOCK'
          ? { isAvailable: true, isOutOfStock: true }
          : { isAvailable: false, isOutOfStock: false };
    return this.prisma.menuItem.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true, nameAr: true } } },
    });
  }

  async addImage(restaurantId: string, id: string, url: string) {
    await this.findOne(restaurantId, id);
    await this.prisma.$transaction([
      this.prisma.menuItemImage.create({ data: { menuItemId: id, url } }),
      // First/primary image also becomes the item's main imageUrl.
      this.prisma.menuItem.update({ where: { id }, data: { imageUrl: url } }),
    ]);
    return this.findOne(restaurantId, id);
  }

  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    await this.prisma.menuItem.update({ where: { id }, data: { deletedAt: new Date() } });
    return { success: true };
  }
}
