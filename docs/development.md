# Development Guide

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Git
- Docker & Docker Compose (optional, for containerized development)

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd barberlab

# Install all dependencies
npm install

# Copy environment template
cp .env.example .env

# Start PostgreSQL (via Docker)
docker compose up -d db

# Run database migrations
npm run db:migrate

# Run seed (development data)
npm run db:seed

# Verify setup
npm run check:boundaries
npm run lint
npm run typecheck
npm run test
npm run build
```

## Available Scripts

### Root Scripts

| Command                    | Description                        |
| -------------------------- | ---------------------------------- |
| `npm run dev`              | Start API Secure + Web dev servers |
| `npm run build`            | Build all packages                 |
| `npm run test`             | Run all tests                      |
| `npm run lint`             | Lint all packages + root           |
| `npm run format`           | Format with Prettier               |
| `npm run format:check`     | Check formatting                   |
| `npm run typecheck`        | TypeScript type checking           |
| `npm run check:boundaries` | Verify import boundaries           |
| `npm run db:migrate`       | Run database migrations            |
| `npm run db:rollback`      | Rollback last migration            |
| `npm run db:seed`          | Run development seed               |
| `npm run db:test`          | Run database integration tests     |

### Database Scripts (via @barberlab/core)

```bash
# Run migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Rollback N migrations
npm run db:rollback -- 3

# Run seed
npm run db:seed

# Run database integration tests
npm run db:test
```

## Package Development

### Core Package (`packages/core`)

```bash
cd packages/core
npm run dev        # Watch mode compilation
npm run build      # Build
npm run test       # Run tests
npm run typecheck  # Type check
npm run db:migrate # Run migrations
npm run db:seed    # Run seed
npm run db:test    # Database integration tests
```

- Contains shared domain logic, application use cases, and PostgreSQL
  persistence
- **Never** import from `api-secure` or `api-vulnerable`
- Export types and interfaces for consumption
- Database infrastructure: connection, migrations, seeds, repositories

### API Secure (`packages/api-secure`)

```bash
cd packages/api-secure
npm run dev        # Start with tsx watch
npm run build      # Build
npm run start      # Run built version
npm run test       # Run tests
```

- Implements SECURE variant
- Uses proper security practices
- Health endpoint: `GET /health`

### API Vulnerable (`packages/api-vulnerable`)

```bash
cd packages/api-vulnerable
npm run dev        # Start with tsx watch
npm run build      # Build
npm run test       # Run tests
```

- Placeholder structure for VULNERABLE variant
- **No vulnerabilities implemented yet**
- Health endpoint: `GET /health`

### Web Frontend (`packages/web`)

```bash
cd packages/web
npm run dev        # Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
npm run test       # Run tests
```

- React + TypeScript + Vite
- Configured via `VITE_API_BASE_URL`
- Builds to `dist/` for Docker

## Environment Variables

All configuration via `.env` file (copy from `.env.example`):

```env
# Application
NODE_ENV=development
PORT=3000

# API Secure
API_SECURE_PORT=3001

# API Vulnerable
API_VULNERABLE_PORT=3002

# Frontend
VITE_API_BASE_URL=http://localhost:3001
VITE_APP_TITLE=BarberLab

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barberlab
DB_USER=barberlab
DB_PASSWORD=changeme

# Database Pool (optional)
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# Test Database (optional)
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=barberlab_test
TEST_DB_USER=barberlab
TEST_DB_PASSWORD=changeme

# JWT (placeholder for future)
JWT_ACCESS_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-secret-key-min-32-chars
```

## Docker Development

```bash
# Start PostgreSQL only
docker compose up -d db

# Start SECURE stack (includes db, api-secure, web)
docker compose --profile secure up -d

# Start VULNERABLE stack (educational only!)
docker compose --profile vulnerable up -d

# View logs
docker compose logs -f api-secure
docker compose logs -f web
docker compose logs -f db

# Stop
docker compose down

# Clean rebuild (removes volumes)
docker compose down -v
docker compose build --no-cache
docker compose --profile secure up -d
```

## Database Development

### Running Migrations

```bash
# Apply all pending migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Rollback N migrations
npm run db:rollback -- 3

# Check migration status (dry-run lists pending migrations)
npm run db:status
```

### Seed Data

```bash
# Run deterministic seed
npm run db:seed
```

**Development Credentials (password for all: `dev123456`):**

- Admin: admin@barberlab.local
- Barbers: joao.barbeiro@barberlab.local, maria.barbeira@barberlab.local
- Customers: carlos.cliente@barberlab.local, ana.cliente@barberlab.local,
  pedro.cliente@barberlab.local

> ⚠️ **NEVER USE THESE CREDENTIALS IN PRODUCTION**

### Database Testing

```bash
# Start test database
docker compose -f docker-compose.test.yml up -d

# Run database integration tests
npm run db:test

# Or run all tests including database
npm run test
```

## Testing

### Unit & Integration Tests

```bash
# All packages
npm run test

# Specific package
npm run test --workspace=@barberlab/api-secure
npm run test --workspace=@barberlab/core
npm run test --workspace=@barberlab/web
npm run test --workspace=@barberlab/api-vulnerable
```

### Database Integration Tests

Located in `packages/core/src/infrastructure/database/tests/integration.test.ts`

Tests validate:

1. Migrations apply from zero
2. Migrations rollback/reapply correctly
3. All tables exist with correct columns
4. Foreign keys enforce referential integrity
5. Unique constraints prevent duplicates
6. Check constraints reject invalid values
7. Indexes exist for query performance
8. Seed creates expected data
9. Seed passwords use Argon2id
10. Transaction isolation works

```bash
# Run database tests
npm run db:test

# Run with coverage
npm run test --workspace=@barberlab/core -- --coverage
```

### Test Structure

- `packages/core` — Domain unit tests, application (use case) tests, and
  database integration tests
  - `src/domain/*.test.ts` — entity/value object/rule tests
  - `src/application/**/*.test.ts` — use case tests (in-memory repositories)
  - `src/infrastructure/database/tests/` — PostgreSQL integration tests
- `packages/api-secure` — API endpoint tests (Supertest)
- `packages/api-vulnerable` — API endpoint tests
- `packages/web` — Component tests (React Testing Library)

## Code Quality

### Linting

```bash
npm run lint          # All packages + root
npm run lint:root     # Root only
```

Rules enforced:

- TypeScript strict mode
- No unused variables
- Consistent type imports
- Import boundary restrictions

### Formatting

```bash
npm run format        # Fix formatting
npm run format:check  # Check only
```

### Type Checking

```bash
npm run typecheck     # All packages + root
```

### Boundary Checking

```bash
npm run check:boundaries
```

Validates:

- `core` → does not import `api-secure` or `api-vulnerable`
- `api-secure` → does not import `api-vulnerable`

## Git Workflow

### Pre-commit Hooks

Husky runs on commit:

- `lint-staged` for changed files
- `check:boundaries`

### Commit Messages

Follow conventional commits:

- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring
- `test:` adding tests
- `docs:` documentation
- `chore:` maintenance

## Adding New Features

### Domain Changes

1. Add entities/value objects/rules to `packages/core/src/domain/`
2. Add repository interfaces to `packages/core/src/persistence/`
3. Add use cases to `packages/core/src/application/`
4. Implement in `packages/api-secure/`
5. Add tests

Domain/application behavior is documented in [`docs/domain.md`](domain.md).

### Database Changes

1. Create migration: `npm run db:create -- -- migration-name`
2. Implement `up` and `down` functions
3. Run `npm run db:migrate`
4. Update seed if needed
5. Add tests for new constraints/indexes

### API Endpoints

1. Define route in `packages/api-secure/src/http/routes/`
2. Add validation schemas (Zod)
3. Add middleware if needed
4. Write tests
5. Update frontend types if needed

### Frontend Pages

1. Add page component in `packages/web/src/pages/`
2. Add API client functions in `packages/web/src/api/`
3. Update routing (when router is added)
4. Write component tests

## Troubleshooting

### TypeScript Errors

```bash
# Clear build cache
rm -rf packages/*/dist
npm run build
```

### Boundary Check Failures

```bash
# Check what's being imported
npm run check:boundaries
```

Common issues:

- Accidental import from wrong package
- Missing `packages/` prefix in import path

### Database Issues

```bash
# Reset development database
docker compose down -v db
docker compose up -d db
npm run db:migrate
npm run db:seed

# Check migration status (dry-run lists pending migrations)
npm run db:status
```

### Docker Issues

```bash
# Clean rebuild
docker compose down -v
docker compose build --no-cache
docker compose --profile secure up -d
```

## IDE Configuration

### VS Code

Recommended extensions:

- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense (if using Tailwind)

Settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

## Security Notes

- **Never commit real secrets** to `.env` or code
- Use `.env.example` for documentation
- Run `npm run check:boundaries` before committing
- SECURE variant must always follow security practices
- VULNERABLE variant changes must be documented in `security-lab/`
- Passwords in seed are development-only (`dev123456`)
- Refresh tokens stored as Argon2id hashes, never plaintext
