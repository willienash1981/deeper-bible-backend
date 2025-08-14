import { UserRole, Permission, RolePermissions } from '../../shared/types/permissions.types';

export const ALL_PERMISSIONS: Permission[] = [
  'read:profile',
  'update:profile',
  'delete:account',
  'read:analysis',
  'generate:analysis',
  'manage:users',
  'manage:prompts',
];

export const ROLE_PERMISSIONS: RolePermissions = {
  user: [
    'read:profile',
    'update:profile',
    'read:analysis',
    'generate:analysis', // Limited generation for free users
  ],
  premium: [
    'read:profile',
    'update:profile',
    'delete:account',
    'read:analysis',
    'generate:analysis', // Unlimited generation for premium users
  ],
  admin: ALL_PERMISSIONS, // Admins have all permissions
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
};