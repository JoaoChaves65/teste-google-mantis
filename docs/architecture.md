# Architecture

## Overview

BarberLab follows a **monorepo with shared core + variant composition**
architecture.

## Monorepo Structure

```
barberlab/
├── packages/
│   ├── core/              # Shared domain (NO vulnerabilities)
│   ├── api-secure/        # SECURE variant
│   ├── api-vulnerable/    # VULNERABLE variant
│   └── web/               # Frontend (shared)
```

## Core Principles

### 1. Shared Core (~80-90% of code)

The `core` package contains:

- Domain entities and value objects
- Business rules and use cases (application layer)
- Repository interfaces (persistence abstraction)
- Shared types and utilities
- **Never** contains variant-specific code

### Layer Separation

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

- `domain/` — entities, value objects (e.g. `Money`), enums, business rules,
  domain errors. No HTTP, no SQL, no `pg`.
- `application/` — use cases that orchestrate domain rules and repository
  interfaces. No HTTP.
- `persistence/` — repository contracts (`UserRepository`, etc.) and the
  `SqlExecutor`/`UnitOfWork` seams. No SQL implementation.
- `infrastructure/` — concrete PostgreSQL implementation, migrations, seed.

See `docs/domain.md` for details.

### 2. Variant Composition

Each API variant (`api-secure`, `api-vulnerable`) is a **thin composition root**
that:

- Imports the shared core
- Provides concrete implementations for security-sensitive interfaces
- Configures middleware, authentication, validation, etc.

### 3. Security Seams (Optional Tool)

Security-sensitive boundaries are defined as interfaces in `core/persistence`
and `core/shared`:

- `SqlExecutor` — Database query execution
- `PasswordHasher` — Password hashing
- `AuthMiddleware` — Authentication/authorization
- `InputValidator` — Request validation
- `ErrorHandler` — Error responses
- `SecurityHeaders` — HTTP security headers

Variants **may** provide different implementations. Seams are a tool, not a
restriction.

## Variant Separation

### Build-Time Isolation

- Each variant has its own `package.json` and `tsconfig.json`
- TypeScript project references enforce dependency direction
- ESLint `import/no-restricted-paths` prevents forbidden imports
- `npm run check:boundaries` script validates boundaries

### Forbidden Import Paths

| From         | Cannot Import                  |
| ------------ | ------------------------------ |
| `core`       | `api-secure`, `api-vulnerable` |
| `api-secure` | `api-vulnerable`               |

### Runtime Isolation

- Separate Docker images per variant
- Separate Docker Compose profiles (`secure`, `vulnerable`)
- Independent databases in containerized deployment
- Frontend points to active variant via environment variable

## Technology Stack

| Layer      | Technology                            |
| ---------- | ------------------------------------- |
| Frontend   | React 18 + TypeScript + Vite          |
| Backend    | Node.js 20 + TypeScript + Express 5   |
| Database   | PostgreSQL 16                         |
| Validation | Zod                                   |
| Auth       | JWT (access + refresh tokens)         |
| Hashing    | Argon2id                              |
| Testing    | Vitest + Supertest + Playwright       |
| Linting    | ESLint + TypeScript ESLint + Prettier |

## Security Practices (SECURE Variant)

- Parameterized queries only (via `SqlExecutor` interface)
- Argon2id password hashing
- Short-lived JWT access tokens + rotating refresh tokens
- Strict CORS, CSP, security headers (Helmet)
- Rate limiting on auth endpoints
- Centralized error handling (no stack traces in responses)
- Input validation on all endpoints
- Secrets via environment variables only

## Future: Vulnerable Variant

The VULNERABLE variant will introduce **controlled, documented
vulnerabilities**:

- Each vulnerability has an ID, category, location, and test case
- Vulnerabilities are isolated when possible
- SECURE variant contains the corresponding fix
- Catalog maintained in `security-lab/vulnerability-catalog.md`

## Development Workflow

1. Changes to domain logic → `packages/core`
2. SECURE implementation → `packages/api-secure`
3. Frontend changes → `packages/web`
4. VULNERABLE variant updated separately with deliberate differences
5. All changes validated by `check:boundaries`, `lint`, `typecheck`, `test`
