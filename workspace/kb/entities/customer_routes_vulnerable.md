<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Customer Routes (Vulnerable)

## Overview

Customer management routes in the vulnerable API variant. Contains IDOR and Mass
Assignment vulnerabilities.

## Location

`packages/api-vulnerable/src/api/v1/customers.routes.ts`

## Endpoints

| Method | Path             | Auth                    | Vulnerabilities                       |
| ------ | ---------------- | ----------------------- | ------------------------------------- |
| GET    | `/customers`     | BARBER, ADMIN           | None (but no CUSTOMER filtering)      |
| GET    | `/customers/:id` | CUSTOMER, BARBER, ADMIN | **IDOR** — no ownership check         |
| POST   | `/customers`     | ADMIN, BARBER           | **Mass Assignment** (role field)      |
| PATCH  | `/customers/:id` | ADMIN, BARBER, CUSTOMER | **IDOR** + **Mass Assignment** (role) |

## Vulnerable Code Patterns

### IDOR (Lines 66-100)

```typescript
router.get(
  '/:id',
  vulnerableRequireRole(UserRole.ADMIN, UserRole.BARBER, UserRole.CUSTOMER),
  async (req, res) => {
    const customer = await getCustomer.execute({ id: parseResult.data.id });
    // NO ownership check — CUSTOMER can access any customer
    res.json({ ...customer });
  }
);
```

### Mass Assignment (Lines 114-137)

```typescript
router.post('/', vulnerableRequireRole(UserRole.ADMIN, UserRole.BARBER), async (req, res) => {
  const { role, ...data } = parseResult.data; // VULNERÁVEL: accepts 'role'
  const input = { ...data, userId: req.user!.sub, ... };
  if (role) {
    (input as any).role = role; // VULNERÁVEL: Mass assignment de role
  }
  const customer = await createCustomer.execute(input);
});
```

### Update IDOR + Mass Assignment (Lines 154-207)

```typescript
router.patch('/:id', vulnerableRequireRole(...), async (req, res) => {
  const { role, ...data } = bodyResult.data;
  const input = { ...data, ... };
  if (role) (input as any).role = role; // Mass assignment
  // NO ownership check — CUSTOMER can update other customers
});
```

## Secure Contrast

See [Customer Routes (Secure)](customer_routes_secure.md) for secure
implementation.

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
