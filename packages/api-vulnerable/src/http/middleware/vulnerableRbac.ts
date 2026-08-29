import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@barberlab/core';

export interface VulnerableAuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email: string;
    role: UserRole;
  };
}

export const vulnerableRequireRole = (...allowedRoles: UserRole[]) => {
  return (req: VulnerableAuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // VULNERÁVEL: Permite que CUSTOMER acesse endpoints ADMIN se souber a URL
    // VULNERÁVEL: Não valida corretamente a hierarquia de roles
    const userRole = req.user.role;

    // VULNERÁVEL: Se o usuário for ADMIN, permite tudo (correto)
    if (userRole === UserRole.ADMIN) {
      next();
      return;
    }

    // VULNERÁVEL: Se for BARBER, permite acessar endpoints de CUSTOMER e BARBER
    // mas NÃO valida ownership dos recursos
    if (userRole === UserRole.BARBER) {
      if (allowedRoles.includes(UserRole.BARBER) || allowedRoles.includes(UserRole.CUSTOMER)) {
        next();
        return;
      }
    }

    // VULNERÁVEL: Se for CUSTOMER, permite acessar endpoints de CUSTOMER
    if (userRole === UserRole.CUSTOMER) {
      if (allowedRoles.includes(UserRole.CUSTOMER)) {
        next();
        return;
      }
    }

    // VULNERÁVEL: Retorna 403 apenas se não corresponder a nenhuma regra
    // Mas não valida ownership de recursos (IDOR)
    res.status(403).json({ error: 'Insufficient permissions' });
  };
};
