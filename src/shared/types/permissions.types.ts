export type UserRole = 'user' | 'premium' | 'admin';

export type Permission = 
  | 'read:profile'
  | 'update:profile'
  | 'delete:account'
  | 'read:analysis'
  | 'generate:analysis'
  | 'manage:users'
  | 'manage:prompts';

export interface RolePermissions {
  [key: string]: Permission[];
}
