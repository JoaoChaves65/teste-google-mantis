<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Service Routes (Vulnerable)

## Overview

Service management routes in the vulnerable API variant. Contains Mass
Assignment vulnerability.

## Location

`packages/api-vulnerable/src/api/v1/services.routes.ts`

## Endpoints

| Method | Path            | Auth                    | Vulnerabilities                                 |
| ------ | --------------- | ----------------------- | ----------------------------------------------- |
| GET    | `/services`     | ADMIN, BARBER, CUSTOMER | No filtering                                    |
| GET    | `/services/:id` | All authenticated       | No ownership check needed (services are public) |
| POST   | `/services`     | All authenticated       | **Mass Assignment** (active field)              |
| PATCH  | `/services/:id` | All authenticated       | **Mass Assignment** (active field)              |

## Vulnerable Code Patterns

### Mass Assignment — Create (Lines 99-127)

```typescript
router.post('/', async (req, res) => {
  const parseResult = createServiceSchema.safeParse(req.body);
  const service = await createService.execute({
    ...parseResult.data,
    price: Money.fromDecimal(parseResult.data.price),
  });
  // active field accepted and passed to domain
});
```

### Mass Assignment — Update (Lines 129-164)

```typescript
router.patch('/:id', async (req, res) => {
  const bodyResult = updateServiceSchema.safeParse(req.body);
  const service = await updateService.execute({
    id: paramsResult.data.id,
    ...bodyResult.data,
    price: bodyResult.data.price
      ? Money.fromDecimal(bodyResult.data.price)
      : undefined,
  });
  // active field accepted and passed to domain
});
```

## Schema Vulnerability

```typescript
const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  durationMinutes: z.number().int().positive(),
  // VULNERÁVEL: Mass Assignment - aceita active
  active: z.boolean().optional(),
});
```

## Secure Contrast

See [Service Routes (Secure)](service_routes_secure.md) for secure
implementation (not yet implemented).

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
