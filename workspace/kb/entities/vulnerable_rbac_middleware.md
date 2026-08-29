<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Vulnerable RBAC Middleware

## Overview

Role-Based Access Control middleware for the vulnerable API variant. Implements
flawed role hierarchy enforcement.

## Location

`packages/api-vulnerable/src/http/middleware/vulnerableRbac.ts`

## Implementation

```typescript
export const vulnerableRequireRole = (...allowedRoles: UserRole[]) => {
  return (
    req: VulnerableAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
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
      if (
        allowedRoles.includes(UserRole.BARBER) ||
        allowedRoles.includes(UserRole.CUSTOMER)
      ) {
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
    // Mas não valida ownership dos recursos (IDOR)
    res.status(403).json({ error: 'Insufficient permissions' });
  };
};
```

## Route-Level RBAC Failures

| Endpoint                   | Required Role | Vulnerable Behavior     |
| -------------------------- | ------------- | ----------------------- |
| `GET /api/v1/users`        | ADMIN         | CUSTOMER/BARBER get 200 |
| `POST /api/v1/users`       | ADMIN         | CUSTOMER/BARBER get 201 |
| `GET /api/v1/transactions` | ADMIN         | CUSTOMER/BARBER get 200 |
| `POST /api/v1/services`    | ADMIN         | BARBER gets 201         |
| `POST /api/v1/barbers`     | ADMIN         | BARBER gets 201         |

## Secure Contrast

See [Secure RBAC Module](rbac_module.md) for correct implementation.

## Test Results

All 8 broken RBAC tests pass in
`packages/api-vulnerable/src/security-lab/broken-rbac.test.ts`.

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
