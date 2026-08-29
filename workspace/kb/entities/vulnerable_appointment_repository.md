<!-- KB_SNAPSHOT: snap_20250829_01 -->
# Vulnerable Appointment Repository

## Overview
Intentionally vulnerable repository implementation for demonstrating SQL Injection vulnerabilities. Located in the shared core package to be used by the vulnerable API variant.

## Location
`packages/core/src/infrastructure/database/repositories/vulnerable-repository.ts`

## Implementation Details

### Class Definition
```typescript
export class VulnerableAppointmentRepository implements AppointmentRepository {
  private executor: SqlExecutor;

  constructor(executor?: SqlExecutor) {
    this.executor = executor || createSqlExecutor();
  }
```

### Vulnerable Methods (String Concatenation)

| Method | Vulnerability | Query Pattern |
|--------|---------------|---------------|
| `findById(id)` | String concat | `WHERE id = '${id}'` |
| `findByCustomerId(customerId)` | String concat | `WHERE customer_id = '${customerId}'` |
| `findByBarberId(barberId)` | Interpolation | `WHERE barber_id = '${barberId}'` |
| `findByStatus(status)` | Template string | `WHERE status = '${status}'` |
| `findByCustomerIdAndStatus` | Multi-concat | `WHERE customer_id = '${c}' AND status = '${status}'` |
| `findByDateRange` | String concat | `WHERE date_time >= '${start}' AND date_time <= '${end}'` |

### Safe Comparison Methods
```typescript
async findByIdSafe(id: string): Promise<Appointment | null> {
  const query = 'SELECT * FROM appointments WHERE id = $1';
  const result = await this.executor.queryOne<Appointment>(query, [id]);
  return result || null;
}

async findByCustomerIdSafe(customerId: string): Promise<Appointment[]> {
  const query = 'SELECT * FROM appointments WHERE customer_id = $1 ORDER BY date_time DESC';
  return this.executor.query<Appointment>(query, [customerId]);
}
```

## Interface Compliance
Implements `AppointmentRepository` interface from `persistence/interfaces.ts`.

## Usage
- **Exported by**: `@barberlab/core` (via `packages/core/src/index.ts`)
- **Used by**: `api-vulnerable` only (in tests and vulnerable endpoints)
- **NOT used by**: `api-secure` (uses `PgAppointmentRepository` with parameterized queries)

## Test Coverage
- `packages/api-vulnerable/src/security-lab/sql-injection.test.ts` — 6 tests demonstrating real exploitation

---

*Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01*