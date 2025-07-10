import { SetMetadata } from '@nestjs/common';
import { USER_PERMISSIONS } from '../../../../packages/shared/src/constants';

type UserRole = keyof typeof USER_PERMISSIONS;

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
