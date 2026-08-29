# BarberLab — Security Lab Educational Project

> ⚠️ **IMPORTANT**: This is an **educational Security Lab**. The VULNERABLE
> variant contains **deliberate security vulnerabilities** for authorized
> testing purposes only.

## Project Overview

BarberLab is a barbershop management system built as a **Security Lab** with two
variants:

- **SECURE** — Application with proper security practices (this is the main
  development branch)
- **VULNERABLE** — Controlled vulnerabilities for security tool testing and
  education

### Architecture

```
barberlab/
├── packages/
│   ├── core/              # Shared domain, types, business rules (NO vulnerabilities)
│   ├── api-secure/        # SECURE variant - Express 5 + proper security
│   ├── api-vulnerable/    # VULNERABLE variant - placeholder for controlled vulnerabilities
│   └── web/               # React + TypeScript + Vite frontend (shared)
├── docs/                  # Documentation
├── security-lab/          # Vulnerability catalog and test cases
├── infra/                 # Docker configuration
└── scripts/               # Utility scripts
```

## Security Warning

> **THE VULNERABLE VARIANT MUST NEVER BE EXPOSED TO THE INTERNET**
>
> - Contains deliberate security vulnerabilities
> - For authorized security testing in isolated environments only
> - Use only in local development or controlled lab environments
> - Vulnerabilities exist exclusively for authorized security testing

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose (for containerized deployment)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd barberlab

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Development Commands

```bash
# Run linting
npm run lint

# Check formatting
npm run format:check

# Format code
npm run format

# Type checking
npm run typecheck

# Run tests
npm run test

# Check import boundaries
npm run check:boundaries

# Build all packages
npm run build

# Start development servers (API secure + Web)
npm run dev
```

### Database Commands

```bash
# Start PostgreSQL (via Docker)
docker compose up -d db

# Run migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback

# Run seed (development data)
npm run db:seed

# Run database integration tests
npm run db:test

# Full database reset (drop, migrate, seed)
docker compose down -v db && docker compose up -d db && npm run db:migrate && npm run db:seed
```

### Docker Deployment

```bash
# Start SECURE variant (default)
docker compose --profile secure up -d

# Start VULNERABLE variant (educational only!)
docker compose --profile vulnerable up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

## Project Structure

### Packages

| Package                     | Description                                 | Port |
| --------------------------- | ------------------------------------------- | ---- |
| `@barberlab/core`           | Shared domain models, types, business rules | —    |
| `@barberlab/api-secure`     | SECURE API variant (Express 5)              | 3001 |
| `@barberlab/api-vulnerable` | VULNERABLE API variant (placeholder)        | 3002 |
| `@barberlab/web`            | React + Vite frontend                       | 5173 |

### Key Principles

1. **Single Source of Truth**: Core domain logic is shared between variants
2. **Controlled Differences**: Vulnerabilities are deliberate, documented, and
   isolated
3. **No Cross-Contamination**: Build-time separation ensures SECURE never
   includes VULNERABLE code
4. **Testable**: Each vulnerability has a corresponding test case validating
   SECURE behavior

## Documentation

- [Architecture](docs/architecture.md) — System architecture and design
  decisions
- [Development](docs/development.md) — Development workflow and guidelines
- [Database](docs/database.md) — Database schema, migrations, and seed
- [Security Lab](security-lab/) — Vulnerability catalog and test cases

## Contributing

This project follows standard practices:

- All code must pass linting, type checking, and tests
- Import boundaries are enforced automatically
- Security practices are documented and reviewed

## License

Educational use only. Not for production deployment.

# teste-google-mantis
