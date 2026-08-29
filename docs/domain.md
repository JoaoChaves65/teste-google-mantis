# Domain Layer

## Overview

The domain and application layers live in `packages/core/src/domain` and
`packages/core/src/application`. They are independent of Express, `pg`,
node-pg-migrate, and React.

```
HTTP
↓
Application  (use cases / application services)
↓
Domain       (entities, value objects, rules)
↓
Persistence interfaces
↓
Infrastructure → PostgreSQL
```

The domain never executes SQL, never knows HTTP, and never holds a `Pool` or
`PoolClient`.

## Entities

| Entity      | File                    | Key invariants                                             |
| ----------- | ----------------------- | ---------------------------------------------------------- |
| User        | `domain/user.ts`        | Valid role/status, normalized email, passwordHash required |
| Customer    | `domain/customer.ts`    | name + phone required, email valid when present            |
| Barber      | `domain/barber.ts`      | name required, active is boolean                           |
| Service     | `domain/service.ts`     | price > 0 (Money), durationMinutes > 0                     |
| Appointment | `domain/appointment.ts` | required refs, valid dateTime, explicit status transitions |
| Transaction | `domain/transaction.ts` | amount > 0, EXPENSE never references an appointment        |

### Relationships

- `Customer.userId` → `User.id` (optional, walk-in allowed)
- `Barber.userId` → `User.id` (optional)
- `Appointment.customerId` → `Customer.id`
- `Appointment.barberId` → `Barber.id`
- `Appointment.serviceId` → `Service.id`
- `Transaction.appointmentId` → `Appointment.id` (INCOME only)
- `Transaction.barberId` → `Barber.id` (optional)

## Money

Monetary values use the `Money` value object (`domain/money.ts`) backed by
**integer cents**. This avoids floating point errors and matches PostgreSQL
`NUMERIC(10,2)` (max ±99,999,999.99, two decimal places).

- `Money.fromDecimal('50.00')` — parse from decimal string/number
- `Money.fromCents(5000)` — build from integer cents
- `Money#toDecimal()` / `#toString()` — serialize back to decimal string

Domain business rules never do arithmetic on `number` for money.

## Email

`domain/email.ts` provides `normalizeEmail`, `isValidEmail`, and
`normalizeAndValidateEmail`. Emails are normalized to trimmed lowercase.

## Appointment Status Transitions

```
PENDING
├── CONFIRMED
└── CANCELLED

CONFIRMED
├── COMPLETED
└── CANCELLED

COMPLETED ─── terminal
CANCELLED ─── terminal
```

Implemented via `canTransitionAppointment(from, to)` and
`transitionAppointment(appointment, to)`. Invalid transitions throw
`InvalidStatusTransitionError`. Same-status transitions are rejected.

Appointment conflict detection (e.g. overlapping schedules) is **deferred** to
the application/persistence layer in a later stage.

## Business Rules

- Inactive barber cannot receive a new appointment (`InactiveBarberError` in
  `CreateAppointment`).
- Inactive service cannot be used for a new appointment (`InactiveServiceError`
  in `CreateAppointment`).
- Appointment status changes are explicit and validated.
- EXPENSE transactions never reference appointments
  (`InvalidTransactionTypeError`).
- `CreateCustomer` / `CreateBarber` verify a linked user exists when `userId` is
  provided (`EntityNotFoundError`).

## Domain Errors

`domain/errors.ts` defines `DomainError` subclasses. They carry a `code` and a
message but **no HTTP status codes**; the HTTP layer maps them later.

- `InvalidDomainError(field, message)`
- `InvalidStatusTransitionError(from, to)`
- `InactiveBarberError(barberId)`
- `InactiveServiceError(serviceId)`
- `InvalidTransactionTypeError(type, message)`
- `EntityNotFoundError(resource, id)`
- `InvalidCredentialsError` — invalid email/password
- `AccountInactiveError` — user status is INACTIVE
- `TokenInvalidError` — malformed or tampered token
- `TokenExpiredError` — token past its expiry
- `TokenRevokedError` — refresh token revoked/rotated
- `InsufficientPermissionsError` — RBAC check failed

## Repository Interfaces

`persistence/interfaces.ts` defines small, operation-specific contracts:

- `UserRepository` — findById, findByEmail, findAll
- `CustomerRepository` / `BarberRepository` / `ServiceRepository` — create,
  update, findById, findAll
- `AppointmentRepository` — create, update, findById, findAll
- `TransactionRepository` — create, update, findById, findAll

`SqlExecutor` and `UnitOfWork` remain in the persistence layer as the seam to
PostgreSQL (implemented in `infrastructure`).

## PostgreSQL Repository Implementations

`infrastructure/database/repositories/` provides concrete PostgreSQL
implementations of all repository interfaces:

- `PgUserRepository` — uses parameterized queries, email lookup
- `PgCustomerRepository` — create, update, findById, findAll
- `PgBarberRepository` — create, update, findById, findAll
- `PgServiceRepository` — create, update, findById, findAll (Money ↔ numeric)
- `PgAppointmentRepository` — create, update, findById, findAll
- `PgTransactionRepository` — create, update, findById, findAll (Money ↔
  numeric)

All implementations:

- Use `PgSqlExecutor` for parameterized queries (no SQL injection)
- Map snake_case database columns to camelCase domain properties
- Convert `Money` (integer cents) ↔ `numeric(10,2)` decimal strings
- Handle nullable fields correctly
- Follow the same pagination pattern via
  `validatePagination`/`createPaginationMeta`

## Application Use Cases

Use cases are classes implementing `Command`, `Query`, or `PaginatedQuery` from
`application/interfaces.ts`. Repositories are injected via constructor.

### Customers

`CreateCustomer`, `UpdateCustomer`, `GetCustomer`, `ListCustomers`

### Barbers

`CreateBarber`, `UpdateBarber`, `GetBarber`, `ListBarbers`

### Services

`CreateService`, `UpdateService`, `GetService`, `ListServices`

### Appointments

`CreateAppointment`, `ConfirmAppointment`, `CancelAppointment`,
`CompleteAppointment`, `GetAppointment`, `ListAppointments`

### Transactions

`CreateTransaction`, `UpdateTransaction`, `GetTransaction`, `ListTransactions`

### Users

`GetUser`, `ListUsers` (preparation for future authentication)

### Authentication

`LoginCommand`, `RefreshTokenCommand`, `LogoutCommand`, `GetCurrentUserQuery`

- `LoginCommand` — validates credentials via `UserRepository` +
  `PasswordHasher`, returns JWT access + refresh token pair
- `RefreshTokenCommand` — rotates refresh token (revokes old, issues new),
  validates via `RefreshTokenRepository`, returns new token pair
- `LogoutCommand` — revokes refresh token by hash
- `GetCurrentUserQuery` — returns authenticated user from `UserRepository`

All auth use cases use `TokenService` (JWT) and `PasswordHasher` (Argon2id) from
`shared/`.

## In-Memory Repositories

`persistence/in-memory/` contains test-only in-memory implementations used by
the application unit tests. They are **not** part of production persistence and
are not exported from the main `persistence` index.

## Authentication System (ETAPA 06)

### Overview

Authentication and authorization are implemented in the SECURE variant
(`packages/api-secure`) with core building blocks in `packages/core`:

- **Password hashing**: Argon2id via `PasswordHasher` interface
  (`shared/password-hasher.ts`)
- **JWT tokens**: Access (15 min) + Refresh (7 days) via `TokenService`
  (`shared/token-service.ts`)
- **Refresh token rotation**: Old token revoked, new token issued, hash stored
  in `refresh_tokens` table
- **Auth middleware**: Extracts/validates Bearer access token, attaches user to
  request
- **RBAC middleware**: Role-based access control (CUSTOMER < BARBER < ADMIN)

### Endpoints (SECURE variant)

| Endpoint        | Method | Auth   | Description                             |
| --------------- | ------ | ------ | --------------------------------------- |
| `/auth/login`   | POST   | —      | Email/password → access + refresh token |
| `/auth/refresh` | POST   | —      | Refresh token rotation → new token pair |
| `/auth/logout`  | POST   | —      | Revoke refresh token                    |
| `/auth/me`      | GET    | Bearer | Current authenticated user              |

### Token Details

- **Access token**: JWT signed with `JWT_ACCESS_SECRET`, 15 min expiry, contains
  `sub`, `email`, `role`, `type: 'access'`
- **Refresh token**: JWT signed with `JWT_REFRESH_SECRET`, 7 days expiry,
  contains `sub`, `email`, `role`, `type: 'refresh'`, hash stored in DB
- **Rotation**: On refresh, old token revoked (`revoked_at`,
  `replaced_by_token_id`), new token hash stored
- **Revocation**: Logout revokes token by hash; refresh marks old as replaced

### Security Properties

- Parameterized queries only (via `SqlExecutor`)
- Argon2id password hashing (memoryCost=64MB, timeCost=3, parallelism=1)
- Short-lived access tokens + rotating refresh tokens
- Refresh token hashes stored (never plaintext)
- Rate limiting on auth endpoints (20 req/15 min)
- Helmet + strict CORS + credentials

### Shared Building Blocks

`packages/core/src/shared/`:

- `password-hasher.ts` — `PasswordHasher` interface + `Argon2idPasswordHasher`
- `token-service.ts` — `TokenService` interface + `JwtTokenService` (JWT)
- `auth.ts` — `JwtPayload`, `TokenPair`, `RefreshTokenData` types

### Application Use Cases

`packages/core/src/application/auth/`:

- `LoginCommand` — credentials → token pair
- `RefreshTokenCommand` — rotation with revocation
- `LogoutCommand` — revoke by hash
- `GetCurrentUserQuery` — user by ID from access token

### PostgreSQL Repository

`infrastructure/database/repositories/refresh-token-repository.ts`:

- `create`, `findByTokenHash`, `findById`, `revoke`, `revokeAllForUser`,
  `markAsReplaced`, `deleteExpired`

### Not Implemented (Future Stages)

- Register, password reset (authentication stage)
- HTTP controllers and routes for business entities
- Appointment conflict detection
- Business frontend
- Anything in the VULNERABLE variant

## Layer Responsibilities

| Layer          | Responsibility                                                |
| -------------- | ------------------------------------------------------------- |
| Domain         | Entities, value objects, enums, business rules, domain errors |
| Application    | Use cases, orchestration, repository interface usage          |
| Persistence    | Repository contracts, SQL executor seam                       |
| Infrastructure | Concrete PostgreSQL implementation, migrations, seed          |
