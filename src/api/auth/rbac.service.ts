import { UserRole, Permission } from '../../shared/types/permissions.types';
import { hasPermission } from './roles';

export class RbacService {
  /**
   * Checks if a user with a given role has a specific permission.
   * @param role The role of the user.
   * @param permission The permission to check.
   * @returns True if the user has the permission, false otherwise.
   */
  check(role: UserRole, permission: Permission): boolean {
    return hasPermission(role, permission);
  }

  /**
   * Checks if a user has all specified permissions.
   * @param role The role of the user.
   * @param permissions An array of permissions to check.
   * @returns True if the user has all permissions, false otherwise.
   */
  checkAll(role: UserRole, permissions: Permission[]): boolean {
    return permissions.every(p => hasPermission(role, p));
  }

  /**
   * Checks if a user has at least one of the specified permissions.
   * @param role The role of the user.
   * @param permissions An array of permissions to check.
   * @returns True if the user has at least one permission, false otherwise.
   */
  checkAny(role: UserRole, permissions: Permission[]): boolean {
    return permissions.some(p => hasPermission(role, p));
  }
}