import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolvePermissionIds(names: string[]): Promise<string[]> {
    if (names.length === 0) return [];
    const perms = await this.prisma.permission.findMany({ where: { name: { in: names } } });
    const found = new Set(perms.map((p) => p.name));
    const missing = names.filter((n) => !found.has(n));
    if (missing.length > 0) {
      throw new BadRequestException(`Unknown permissions: ${missing.join(', ')}`);
    }
    return perms.map((p) => p.id);
  }

  findAll(restaurantId: string) {
    return this.prisma.role.findMany({
      where: { restaurantId },
      include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(restaurantId: string, dto: CreateRoleDto) {
    const permissionIds = await this.resolvePermissionIds(dto.permissions ?? []);
    return this.prisma.role.create({
      data: {
        restaurantId,
        name: dto.name,
        description: dto.description,
        permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  private async getOwnedRole(restaurantId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, restaurantId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async update(restaurantId: string, id: string, dto: UpdateRoleDto) {
    await this.getOwnedRole(restaurantId, id);

    if (dto.permissions) {
      const permissionIds = await this.resolvePermissionIds(dto.permissions);
      await this.prisma.$transaction([
        this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
        this.prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        }),
      ]);
    }

    return this.prisma.role.update({
      where: { id },
      data: { name: dto.name, description: dto.description },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async setPermissions(restaurantId: string, id: string, names: string[]) {
    await this.getOwnedRole(restaurantId, id);
    const permissionIds = await this.resolvePermissionIds(names);
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
      }),
    ]);
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async remove(restaurantId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, restaurantId },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    if (role._count.users > 0) {
      throw new BadRequestException('Cannot delete a role that still has staff assigned');
    }
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
