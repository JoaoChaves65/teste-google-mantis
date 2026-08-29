<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Secure RBAC Module

## Overview

Role-Based Access Control middleware for the secure API variant. Implements
strict role hierarchy enforcement.

## Location

`packages/api-secure/src/http/middleware/rbac.ts`

## Implementation

```typescript
export type UserRole = 'CUSTOMER' | 'BARBER' | 'ADMIN';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
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
export const requireCustomerOrAbove = requireRole(
  'CUSTOMER',
  'BARBER',
  'ADMIN'
);
```

## Route-Level Usage

```typescript
// Admin-only endpoints
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', async (req, res) => { ... });
router.post('/', async (req, res) => { ... });

// Barber or Admin endpoints
router.use(requireBarberOrAdmin);
router.post('/', async (req, res) => { ... });

// All authenticated users
router.use(requireCustomerOrAbove);
```

## Predefined Role Combinations

| Export                   | Roles                             | Use Case                  |
| ------------------------ | --------------------------------- | ------------------------- |
| `requireAdmin`           | `['ADMIN']`                       | Admin-only endpoints      |
| `requireBarberOrAdmin`   | `['BARBER', 'ADMIN']`             | Barber management         |
| `requireCustomerOrAbove` | `['CUSTOMER', 'BARBER', 'ADMIN']` | Customer-facing endpoints |

## Vulnerable Contrast

See [Vulnerable RBAC Middleware](vulnerable_rbac_middleware.md) for the broken
implementation.

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
