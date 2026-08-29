import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth';

export type UserRole = 'CUSTOMER' | 'BARBER' | 'ADMIN';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole('ADMIN');
export const requireBarberOrAdmin = requireRole('BARBER', 'ADMIN');
export const requireCustomerOrAbove = requireRole('CUSTOMER', 'BARBER', 'ADMIN');
