import { SetMetadata } from '@nestjs/common';
import { PermissionKey } from '../../common/constants/permissions';

export const PERMISSIONS_KEY = 'requiredPermissions';
export const RequirePermissions = (...permissions: PermissionKey[]): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSIONS_KEY, permissions);
