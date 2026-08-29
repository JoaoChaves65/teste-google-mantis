<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Customer Entity

## Overview

Represents a client profile linked to a User account. May exist without a linked
User (walk-in customer).

## Definition

```typescript
// packages/core/src/domain/customer.ts
export interface Customer {
  id: string; // UUID v4
  userId: string | null; // nullable: walk-in customer
  name: string; // 1-255 chars, trimmed
  phone: string; // 10-20 chars
  email: string | null; // optional, normalized
  birthDate: Date | null; // optional
  notes: string | null; // optional, max 500
  createdAt: Date;
  updatedAt: Date;
  user?: User; // populated when joined
}
```

## Invariants

- `name` non-empty, trimmed
- `phone` 10-20 chars
- `email` valid format if present
- `userId` if present → valid User
- `id` is UUID v4

## Creation Rules

```typescript
// packages/core/src/domain/customer.ts:createCustomer()
createCustomer(input: CreateCustomerInput): Customer
// Input: { userId?, name, phone, email?, birthDate?, notes? }
// Validates: name required, phone required, email format if present
// birthDate: valid Date if provided
```

## Repository Interface

```typescript
interface CustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByUserId(userId: string): Promise<Customer | null>;
  findByEmail(email: string): Promise<Customer | null>;
  findAll(params: PaginationParams): Promise<PaginatedResponse<Customer>>;
  create(customer: Customer): Promise<Customer>;
  update(customer: Customer): Promise<Customer>;
  delete(id: string): Promise<void>;
}
```

## Secure vs Vulnerable Behavior

| Aspect              | Secure (`api-secure`)                      | Vulnerable (`api-vulnerable`)           |
| ------------------- | ------------------------------------------ | --------------------------------------- |
| **Create**          | Schema excludes `role`                     | Schema accepts `role` (mass assignment) |
| **Update**          | Schema excludes `role`                     | Schema accepts `role` (mass assignment) |
| **Ownership Check** | `checkCustomerAccess()` middleware         | **None** — any authenticated user       |
| **List Filtering**  | ADMIN: all, CUSTOMER: own, BARBER: related | No filtering (ADMIN/BARBER see all)     |

## Associated Vulnerabilities

| Vulnerability          | CWE     | Severity | Files                                                       |
| ---------------------- | ------- | -------- | ----------------------------------------------------------- |
| IDOR (Customer)        | CWE-639 | HIGH     | `customers.routes.ts` GET `/:id`, PATCH `/:id`              |
| IDOR (Appointment)     | CWE-639 | HIGH     | `appointments.routes.ts` GET `:id`, PATCH `:id/status`      |
| Mass Assignment (role) | CWE-915 | HIGH     | `createCustomerSchema`, `updateCustomerSchema` (vulnerable) |
| Broken RBAC            | CWE-285 | HIGH     | Missing `checkCustomerAccess` in vulnerable                 |

## Domain Invariants

```typescript
// name required, trimmed
if (!input.name?.trim()) throw InvalidDomainError('name', 'required');

// phone required, 10-20 chars
if (!input.phone?.trim() || input.phone.length < 10 || input.phone.length > 20)
  throw InvalidDomainError('phone', 'invalid length');

// email format if provided
if (input.email !== undefined) normalizeAndValidateEmail(input.email);
```

## Related Components

- [Customer Routes (Vulnerable)](../entities/customer_routes_vulnerable.md)
- [Customer Routes (Secure)](../entities/customer_routes_secure.md)
- [Customer Repository](../entities/customer_repository.md)
- [CreateCustomer Use Case](../entities/create_customer_use_case.md)

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
