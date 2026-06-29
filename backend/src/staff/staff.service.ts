import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

// Never return the password hash.
const staffSelect = {
  id: true,
  fullName: true,
  email: true,
  username: true,
  phoneNumber: true,
  status: true,
  joiningDate: true,
  profileImage: true,
  roleId: true,
  role: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(restaurantId: string) {
    return this.prisma.user.findMany({
      where: { restaurantId, status: { not: 'DELETED' } },
      select: staffSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(restaurantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, restaurantId, status: { not: 'DELETED' } },
      select: staffSelect,
    });
    if (!user) {
      throw new NotFoundException('Staff member not found');
    }
    return user;
  }

  private async assertRoleExists(restaurantId: string, roleId: string): Promise<void> {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, restaurantId } });
    if (!role) {
      throw new BadRequestException('Invalid roleId');
    }
  }

  async create(restaurantId: string, dto: CreateStaffDto) {
    await this.assertRoleExists(restaurantId, dto.roleId);

    const existing = await this.prisma.user.findFirst({
      where: {
        restaurantId,
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });
    if (existing) {
      throw new ConflictException('Email or username already in use');
    }

    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        restaurantId,
        roleId: dto.roleId,
        fullName: dto.fullName,
        email: dto.email,
        username: dto.username,
        passwordHash,
        phoneNumber: dto.phoneNumber,
        profileImage: dto.profileImage,
        joiningDate: new Date(),
      },
      select: staffSelect,
    });
  }

  async update(restaurantId: string, id: string, dto: UpdateStaffDto) {
    await this.findOne(restaurantId, id);
    if (dto.roleId) {
      await this.assertRoleExists(restaurantId, dto.roleId);
    }

    if (dto.email || dto.username) {
      const clash = await this.prisma.user.findFirst({
        where: {
          restaurantId,
          id: { not: id },
          OR: [
            ...(dto.email ? [{ email: dto.email }] : []),
            ...(dto.username ? [{ username: dto.username }] : []),
          ],
        },
      });
      if (clash) {
        throw new ConflictException('Email or username already in use');
      }
    }

    const data: Prisma.UserUpdateInput = {
      fullName: dto.fullName,
      email: dto.email,
      username: dto.username,
      phoneNumber: dto.phoneNumber,
      profileImage: dto.profileImage,
    };
    if (dto.roleId) {
      data.role = { connect: { id: dto.roleId } };
    }
    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
    }

    return this.prisma.user.update({ where: { id }, data, select: staffSelect });
  }

  async setStatus(restaurantId: string, id: string, status: 'ACTIVE' | 'INACTIVE', actorId: string) {
    if (id === actorId && status === 'INACTIVE') {
      throw new ForbiddenException('You cannot deactivate your own account');
    }
    await this.findOne(restaurantId, id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: staffSelect,
    });
    // Revoke sessions when deactivating.
    if (status === 'INACTIVE') {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }
    return user;
  }

  async remove(restaurantId: string, id: string, actorId: string) {
    if (id === actorId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    await this.findOne(restaurantId, id);
    // Soft delete + revoke sessions.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { status: 'DELETED', deletedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: id } }),
    ]);
    return { success: true };
  }
}
