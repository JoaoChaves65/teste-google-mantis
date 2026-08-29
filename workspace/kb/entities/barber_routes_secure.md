<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Barber Routes (Secure)

## Overview

Barber management routes in the secure API variant. Implements proper ownership
checks.

## Location

`packages/api-secure/src/api/v1/barbers.routes.ts`

## Endpoints

| Method | Path           | Auth                    | Protection                                 |
| ------ | -------------- | ----------------------- | ------------------------------------------ |
| GET    | `/barbers`     | ADMIN, BARBER, CUSTOMER | Role-based filtering                       |
| GET    | `/barbers/:id` | ADMIN, BARBER, CUSTOMER | `checkBarberAccess` ownership              |
| POST   | `/barbers`     | ADMIN                   | Schema excludes `active`                   |
| PATCH  | `/barbers/:id` | ADMIN, BARBER           | Ownership check + schema excludes `active` |

## Secure Patterns

### Ownership Check

```typescript
async function checkBarberAccess(
  req: AuthenticatedRequest,
  barberId: string
): Promise<{
  allowed: boolean;
  barber?: { userId: string | null };
  notFound?: boolean;
}> {
  const executor = createSqlExecutor();
  const barbersRepo = new PgBarberRepository(executor);
  const barber = await barbersRepo.findById(barberId);
  if (!barber) return { allowed: false, notFound: true };

  const userRole = req.user!.role as UserRole;
  const userId = req.user!.sub;

  if (userRole === 'ADMIN') return { allowed: true, barber };
  if (userRole === 'BARBER' && barber.userId === userId)
    return { allowed: true, barber };
  if (userRole === 'CUSTOMER') return { allowed: true, barber }; // Customers can view
  return { allowed: false };
}
```

### Schema Excludes `active`

```typescript
const createBarberSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  phone: z.string().max(50).optional(),
  specialty: z.string().max(100).optional(),
  hireDate: z.string().datetime().optional(),
  // NO 'active' field — domain defaults to true
});
```

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
