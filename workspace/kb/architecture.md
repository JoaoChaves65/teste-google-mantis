<!-- KB_SNAPSHOT: snap_20250829_01 -->

# Architecture Overview

## System Overview

BarberLab is a monorepo-based barbershop management system with **dual-API
architecture**:

- **`@barberlab/api-secure`** (port 3001): Production-ready API with full
  security controls
- **`@barberlab/api-vulnerable`** (port 3002): Intentionally vulnerable API for
  security training/labs
- **`@barberlab/core`**: Shared domain, application logic, persistence
  interfaces, and infrastructure
- **`@barberlab/web`** (port 5173): React + Vite frontend consuming the secure
  API

Both APIs share the **same core domain logic** (`@barberlab/core`) but implement
**different security postures** at the HTTP/presentation layer.

---

## High-Level Data Flow

```
┌─────────────┐     HTTPS      ┌─────────────────┐
│   Web UI    │ ──────────────► │  API Secure     │
│  (React)    │   (port 3001)   │  (port 3001)    │
└─────────────┘                 └────────┬────────┘
                                         │
                    ┌────────────────────┘
                    │
                    ▼
                    ┌─────────────────┐
                    │  @barberlab/core │
                    │  Domain Layer    │
                    │  Application     │
                    │  Interfaces      │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │  Infrastructure │
                    │  (PostgreSQL)   │
                    └─────────────────┘
```

**Vulnerable API** runs in parallel on port 3002 with identical domain layer but
**intentionally weakened** HTTP layer.

---

## Trust Zones

| Zone                     | Components                              | Trust Level  |
| ------------------------ | --------------------------------------- | ------------ |
| **Public Internet**      | Web UI, API endpoints                   | UNTRUSTED    |
| **API Gateway**          | Express + Helmet + CORS + Rate Limiting | SEMI-TRUSTED |
| **Authentication Layer** | JWT (access + refresh tokens), Argon2id | TRUSTED      |
| **Authorization Layer**  | RBAC (ADMIN/BARBER/CUSTOMER)            | TRUSTED      |
| **Application Layer**    | Use Cases, Domain Services              | TRUSTED      |
| **Persistence Layer**    | Repository Interfaces → PostgreSQL      | TRUSTED      |
| **Database**             | PostgreSQL 16 (isolated network)        | TRUSTED      |

---

## Core Domain Entities

| Entity          | Description                             | Key Invariants                                                                    |
| --------------- | --------------------------------------- | --------------------------------------------------------------------------------- |
| **User**        | Authentication principal                | email unique, role ∈ {ADMIN, BARBER, CUSTOMER}, status ∈ {ACTIVE, INACTIVE}       |
| **Customer**    | Client profile linked to User           | userId optional (walk-in), phone unique                                           |
| **Barber**      | Professional profile linked to User     | userId optional, hireDate, specialty                                              |
| **Service**     | Bookable service                        | price > 0, duration > 0                                                           |
| **Appointment** | Booking linking Customer+Barber+Service | status ∈ {PENDING, CONFIRMED, COMPLETED, CANCELLED}, status transitions validated |
| **Transaction** | Financial record                        | type ∈ {INCOME, EXPENSE}, INCOME may have appointmentId, EXPENSE must not         |

---

## Trust Boundaries

| Boundary                 | Components                | Validation                                                  |
| ------------------------ | ------------------------- | ----------------------------------------------------------- |
| **HTTP → Application**   | Express → Use Cases       | Zod schemas, auth middleware, RBAC                          |
| **Application → Domain** | Use Cases → Entities      | Domain factories, invariants                                |
| **Domain → Persistence** | Entities → Repositories   | Interface contracts, mapping                                |
| **Persistence → DB**     | Repositories → PostgreSQL | Parameterized queries (secure) / string concat (vulnerable) |

---

## API Surface (Both Variants)

| Module           | Endpoints                                                                     | Auth Required      | Roles                                |
| ---------------- | ----------------------------------------------------------------------------- | ------------------ | ------------------------------------ |
| **Auth**         | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | JWT (except login) | All                                  |
| **Users**        | CRUD `/api/v1/users`                                                          | JWT + RBAC         | ADMIN                                |
| **Customers**    | CRUD `/api/v1/customers`                                                      | JWT + RBAC         | ADMIN, BARBER (list), CUSTOMER (own) |
| **Barbers**      | CRUD `/api/v1/barbers`                                                        | JWT + RBAC         | ADMIN                                |
| **Services**     | CRUD `/api/v1/services`                                                       | JWT + RBAC         | ADMIN (list: all)                    |
| **Appointments** | CRUD + status transitions                                                     | JWT + RBAC         | All (ownership checks)               |
| **Transactions** | CRUD `/api/v1/transactions`                                                   | JWT + RBAC         | ADMIN                                |

---

## Security Posture Differences

| Aspect               | `api-secure`                                             | `api-vulnerable`                                                        |
| -------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Auth Middleware**  | Validates token, checks revocation, account status       | Same but **no revocation check**, no inactive account check             |
| **RBAC**             | `requireRole()` strict hierarchy                         | `vulnerableRequireRole()` allows CUSTOMER→ADMIN if role in allowedRoles |
| **Ownership Checks** | `checkCustomerAccess`, `checkBarberAccess`               | **Missing** on GET `/:id`, PATCH `/:id`                                 |
| **Mass Assignment**  | Schemas **exclude** privileged fields (`role`, `active`) | Schemas **include** `role`, `active`; handlers pass through             |
| **SQL Queries**      | Parameterized (`$1`, `$2`)                               | **String concatenation** in `VulnerableAppointmentRepository`           |
| **Error Handling**   | Sanitized (no stack, no internals)                       | **Exposes stack traces, SQL, internals**                                |
| **Sensitive Data**   | `passwordHash` **never** in responses                    | `passwordHash` **exposed** in `/users` responses                        |
| **Rate Limiting**    | Express-rate-limit on auth                               | Same                                                                    |
| **Security Headers** | Helmet + strict CSP                                      | Helmet (default)                                                        |

---

## Infrastructure

| Component      | Technology                     |
| -------------- | ------------------------------ |
| **Runtime**    | Node.js 20 + TypeScript 5.4    |
| **Framework**  | Express 5                      |
| **Database**   | PostgreSQL 16 (pg driver)      |
| **Migrations** | node-pg-migrate (JS files)     |
| **Auth**       | JWT (HS256) + Argon2id         |
| **Validation** | Zod schemas                    |
| **Testing**    | Vitest + Supertest             |
| **Frontend**   | React 18 + Vite + React Router |

---

## Deployment Topology

```
Docker Compose:
├── db (PostgreSQL 16)          → port 5432
├── api-secure (profile: secure)  → port 3001
├── api-vulnerable (profile: vulnerable) → port 3002
└── web (nginx + Vite)          → port 5173
```

Network: `barberlab-network` (bridge), all services communicate via service
names.

---

## Key Architectural Decisions

| Decision                                    | Rationale                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| **Monorepo + shared core**                  | Single source of truth for domain logic; variants differ only at HTTP boundary |
| **Dual API variants**                       | Enables side-by-side security training; same domain, different postures        |
| **VulnerableAppointmentRepository in core** | Shared vulnerability for training; isolated in infrastructure layer            |
| **Parameterized queries in secure repos**   | Prevents SQLi; vulnerable repo demonstrates anti-pattern                       |
| **Argon2id for passwords**                  | Memory-hard, resistant to GPU cracking                                         |
| **JWT + Refresh rotation**                  | Short-lived access (15m) + rotating refresh (7d)                               |
| **Zod for all boundaries**                  | Schema validation at HTTP boundary                                             |
| **Helmet + CORS + Rate Limit**              | Defense in depth at HTTP layer                                                 |

---

## Known Vulnerabilities (Intentional in api-vulnerable)

| ID       | Category                   | Location                                                                                                 | Severity |
| -------- | -------------------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| VULN-001 | SQL Injection              | `VulnerableAppointmentRepository` (core)                                                                 | CRITICAL |
| VULN-002 | IDOR                       | `customers.routes.ts`, `appointments.routes.ts`, `barbers.routes.ts`, `users.routes.ts` (api-vulnerable) | HIGH     |
| VULN-003 | Mass Assignment            | `customers.routes.ts`, `barbers.routes.ts`, `services.routes.ts`, `users.routes.ts` (api-vulnerable)     | HIGH     |
| VULN-004 | Broken RBAC                | `vulnerableRbac.ts`, missing `requireAdmin` on routes                                                    | HIGH     |
| VULN-005 | Sensitive Data Exposure    | `users.routes.ts` (api-vulnerable) exposes `passwordHash`                                                | CRITICAL |
| VULN-006 | Excessive Error Disclosure | `vulnerableErrorHandler.ts` exposes stack traces                                                         | MEDIUM   |
| VULN-007 | Broken Auth                | `vulnerableAuth.ts` no revocation/inactive check                                                         | MEDIUM   |
| VULN-008 | Mass Assignment (User)     | `users.routes.ts` (api-vulnerable) accepts `role`                                                        | CRITICAL |

---

_Document generated by Mantis Architecture pass 1 — KB_SNAPSHOT:
snap_20250829_01_
