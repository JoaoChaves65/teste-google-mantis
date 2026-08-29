<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Barber Routes (Vulnerable)

## Overview

Barber management routes in the vulnerable API variant. Contains IDOR and Mass
Assignment vulnerabilities.

## Location

`packages/api-vulnerable/src/api/v1/barbers.routes.ts`

## Endpoints

| Method | Path           | Auth                    | Vulnerabilities                    |
| ------ | -------------- | ----------------------- | ---------------------------------- |
| GET    | `/barbers`     | ADMIN, BARBER, CUSTOMER | No ownership filtering             |
| GET    | `/barbers/:id` | All authenticated       | **IDOR** — no ownership check      |
| POST   | `/barbers`     | All authenticated       | **Mass Assignment** (active field) |
| PATCH  | `/barbers/:id` | All authenticated       | **Mass Assignment** (active field) |

## Vulnerable Code Patterns

### IDOR (Lines 60-88)

```typescript
router.get('/:id', async (req, res) => {
  const barber = await getBarber.execute({ id: parseResult.data.id });
  // NO ownership check — any authenticated user can access any barber
  res.json({ ...barber });
});
```

### Mass Assignment — Create (Lines 100-117)

```typescript
router.post('/', async (req, res) => {
  const parseResult = createBarberSchema.safeParse(req.body);
  const barber = await createBarber.execute({
    ...parseResult.data,
    hireDate: new Date(parseResult.data.hireDate),
  });
  // active field accepted and passed to domain
});
```

### Mass Assignment — Update (Lines 132-148)

```typescript
router.patch('/:id', async (req, res) => {
  const bodyResult = updateBarberSchema.safeParse(req.body);
  const barber = await updateBarber.execute({
    id: paramsResult.data.id,
    ...bodyResult.data,
  });
  // active field accepted and passed to domain
});
```

## Schema Vulnerability

```typescript
const createBarberSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(20).optional(),
  specialty: z.string().max(100).optional(),
  hireDate: z.string().datetime(),
  // VULNERÁVEL: Mass Assignment - aceita active
  active: z.boolean().optional(),
});
```

## Secure Contrast

See [Barber Routes (Secure)](barber_routes_secure.md) for secure implementation
(not yet implemented).

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
