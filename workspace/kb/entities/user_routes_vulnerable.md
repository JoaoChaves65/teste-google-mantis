<!-- KB_SNAPSHOT: snap_20250829_01 -->

# User Routes (Vulnerable)

## Overview

User management routes in the vulnerable API variant. Contains Mass Assignment
(role) and Sensitive Data Exposure vulnerabilities.

## Location

`packages/api-vulnerable/src/api/v1/users.routes.ts`

## Endpoints

| Method | Path         | Auth              | Vulnerabilities                                      |
| ------ | ------------ | ----------------- | ---------------------------------------------------- |
| GET    | `/users`     | All authenticated | **Sensitive Data Exposure** — exposes `passwordHash` |
| GET    | `/users/:id` | All authenticated | **Sensitive Data Exposure** — exposes `passwordHash` |
| POST   | `/users`     | All authenticated | **Mass Assignment** (role field)                     |

## Vulnerable Code Patterns

### Sensitive Data Exposure (Lines 31-63)

```typescript
router.get('/', async (req, res) => {
  const result = await listUsers.execute(parseResult.data);

  // VULNERÁVEL: Expõe passwordHash na listagem
  res.json({
    ...result,
    data: result.data.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      // VULNERÁVEL: Expõe passwordHash
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  });
});

router.get('/:id', async (req, res) => {
  const user = await usersRepo.findById(parseResult.data.id);
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    // VULNERÁVEL: Expõe passwordHash
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});
```

### Mass Assignment — Create (Lines 71-96)

```typescript
router.post('/', async (req, res) => {
  const parseResult = createUserSchema.safeParse(req.body);
  // ...
  const user = createUser({
    name: parseResult.data.name,
    email: parseResult.data.email,
    passwordHash,
    role: parseResult.data.role as UserRole, // VULNERÁVEL: Mass assignment de role
  });
  await usersRepo.create(user);
});
```

### Schema Vulnerability

```typescript
const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  // VULNERÁVEL: Mass Assignment - aceita role
  role: z.enum(['ADMIN', 'BARBER', 'CUSTOMER']).default('CUSTOMER'),
});
```

## Secure Contrast

See [User Entity](user_entity.md) for secure implementation notes.

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
