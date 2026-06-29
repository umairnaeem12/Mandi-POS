import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(restaurantId: string, includeInactive = false) {
    return this.prisma.category.findMany({
      where: {
        restaurantId,
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: { _count: { select: { menuItems: { where: { deletedAt: null } } } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(restaurantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, restaurantId, deletedAt: null },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  // Unique name among non-deleted categories of the restaurant.
  private async assertNameFree(restaurantId: string, name: string, exceptId?: string) {
    const clash = await this.prisma.category.findFirst({
      where: { restaurantId, name, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    });
    if (clash) {
      throw new ConflictException('A category with this name already exists');
    }
  }

  async create(restaurantId: string, dto: CreateCategoryDto) {
    await this.assertNameFree(restaurantId, dto.name);
    return this.prisma.category.create({
      data: {
        restaurantId,
        name: dto.name,
        nameAr: dto.nameAr,
        description: dto.description,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(restaurantId, id);
    if (dto.name) {
      await this.assertNameFree(restaurantId, dto.name, id);
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  // Soft delete (spec: categories with items must not be hard-deleted).
  async remove(restaurantId: string, id: string) {
    await this.findOne(restaurantId, id);
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }
}
