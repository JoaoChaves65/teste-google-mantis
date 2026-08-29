<!-- KB_SNAPSHOT: snap_20250829_01 -->
# User Entity

## Overview
Core identity entity representing any authenticated principal in the system.

## Definition

```typescript
// packages/core/src/domain/user.ts
export interface User {
  id: string;              // UUID v4
  name: string;            // 1-255 chars
  email: string;           // unique, normalized lowercase
  passwordHash: string;    // Argon2id hash
  role: UserRole;          // ADMIN | BARBER | CUSTOMER
  status: UserStatus;      // ACTIVE | INACTIVE
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  BARBER = 'BARBER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}
```

## Invariants
- `email` unique, normalized to lowercase
- `passwordHash` never empty, Argon2id format
- `role` ∈ {ADMIN, BARBER, CUSTOMER}
- `status` ∈ {ACTIVE, INACTIVE}
- `id` is UUID v4

## Creation Rules
```typescript
// Domain factory: packages/core/src/domain/user.ts:createUser()
createUser(input: CreateUserInput): User
// Validates: name non-empty, email valid, passwordHash present, role valid
// Sets: status = ACTIVE, timestamps = now()
```

## Associated Repositories
| Interface | Secure Implementation | Vulnerable |
|-----------|----------------------|------------|
| `UserRepository` | `PgUserRepository` | — |
| `InMemoryUserRepository` | (testing) | — |

## Security Considerations

| Aspect | Secure (`api-secure`) | Vulnerable (`api-vulnerable`) |
|--------|----------------------|------------------------------|
| **Password Hash** | Argon2id (memory-cost 2^16) | Same |
| **Exposure** | **Never** in responses | **Exposed** in `/users` & `/users/:id` |
| **Role Assignment** | Server-controlled (ADMIN only) | **Mass Assignment** via `role` field |
| **Status Check** | Checked on login (`ACTIVE` required) | **Not checked** in vulnerable auth |

## Associated Vulnerabilities

| Vulnerability | CWE | Files |
|---------------|-----|-------|
| Sensitive Data Exposure | CWE-200 | `packages/api-vulnerable/src/api/v1/users.routes.ts` |
| Mass Assignment (Role) | CWE-915 | `packages/api-vulnerable/src/api/v1/users.routes.ts` (POST) |
| Broken Auth (Status) | CWE-306 | `vulnerableAuth.ts` (no inactive check) |

## Domain Invariants
```typescript
// email must be valid RFC 5322
normalizeAndValidateEmail(email: string): string

// role must be valid enum
USER_ROLES.includes(role)  // throws InvalidDomainError if not

// password hash required
if (!input.passwordHash) throw InvalidDomainError('passwordHash', 'required')
```

## Related Components
- [Auth Module](../entities/auth_module.md)
- [RBAC Module](../entities/rbac_module.md)
- [Auth Middleware](../entities/auth_middleware.md)
- [User Repository](../entities/user_repository.md)

---

*Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01*