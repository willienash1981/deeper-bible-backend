import { Request, Response, NextFunction } from 'express';
import { RbacService } from '../auth/rbac.service';
import { Permission, UserRole } from '../../shared/types/permissions.types';
import { AuthUser } from '../../shared/types/auth.types';

interface AuthRequest extends Request {
  user?: AuthUser;
}

const rbacService = new RbacService();

export const authorize = (requiredPermissions: Permission[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    // Map subscription_tier to UserRole
    let userRole: UserRole;
    switch (req.user.subscription_tier) {
      case 'free':
        userRole = 'user';
        break;
      case 'premium':
        userRole = 'premium';
        break;
      case 'admin':
        userRole = 'admin';
        break;
      default:
        userRole = 'user';
    }

    const hasAllPermissions = rbacService.checkAll(userRole, requiredPermissions);

    if (hasAllPermissions) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden: Insufficient permissions.' });
    }
  };
};