<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Customer Routes (Secure)

## Overview

Customer management routes in the secure API variant. Implements proper
ownership checks and rejects mass assignment.

## Location

`packages/api-secure/src/api/v1/customers.routes.ts`

## Endpoints

| Method | Path             | Auth                    | Protection                               |
| ------ | ---------------- | ----------------------- | ---------------------------------------- |
| GET    | `/customers`     | ADMIN, BARBER, CUSTOMER | Role-based filtering                     |
| GET    | `/customers/:id` | ADMIN, BARBER, CUSTOMER | `checkCustomerAccess` ownership          |
| POST   | `/customers`     | ADMIN, BARBER           | Schema excludes `role`                   |
| PATCH  | `/customers/:id` | ADMIN, CUSTOMER         | Ownership check + schema excludes `role` |

## Secure Patterns

### Ownership Check (Lines 51-90)

```typescript
async function checkCustomerAccess(
  req: AuthenticatedRequest,
  customerId: string
): Promise<{
  allowed: boolean;
  customer?: { userId: string | null };
  notFound?: boolean;
}> {
  const customer = await customersRepo.findById(customerId);
  if (!customer) return { allowed: false, notFound: true };

  const userRole = req.user!.role as UserRole;
  const userId = req.user!.sub;

  if (userRole === 'ADMIN') return { allowed: true, customer };
  if (userRole === 'CUSTOMER' && customer.userId === userId)
    return { allowed: true, customer };

  if (userRole === 'BARBER') {
    const appointments = await appointmentsRepo.findAll({
      page: 1,
      limit: 1000,
    });
    const hasRelation = appointments.data.some(
      a => a.customerId === customerId && a.barberId === barber.id
    );
    return { allowed: hasRelation, customer };
  }
  return { allowed: false };
}
```

### Schema Excludes Privileged Fields

```typescript
const createCustomerSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(50),
  email: z.string().email().optional(),
  birthDate: z.string().datetime().optional(),
  notes: z.string().optional(),
  // NO 'role' field — set by server
});
```

### Handler Uses Safe Input

```typescript
router.post('/', requireRole('ADMIN', 'BARBER'), async (req, res) => {
  const input = {
    ...parseResult.data,
    birthDate: parseResult.data.birthDate
      ? new Date(parseResult.data.birthDate)
      : undefined,
  };
  const customer = await createCustomer.execute(input);
  // role is NOT passed — domain defaults apply
});
```

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
