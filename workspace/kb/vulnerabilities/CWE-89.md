<!-- KB_SNAPSHOT: snap_20250829_01 -->

# CWE-89: SQL Injection

## Overview

Improper neutralization of special elements used in an SQL command. The
`VulnerableAppointmentRepository` in `@barberlab/core` intentionally uses string
concatenation instead of parameterized queries.

## Vulnerable Implementation

**Location**:
`packages/core/src/infrastructure/database/repositories/vulnerable-repository.ts`

```typescript
// VULNERABLE: Direct string concatenation
async findByCustomerId(customerId: string): Promise<Appointment[]> {
  const query = `SELECT * FROM appointments WHERE customer_id = '${customerId}' ORDER BY date_time DESC`;
  return this.executor.query<Appointment>(query, []);
}

async findByBarberId(barberId: string): Promise<Appointment[]> {
  const query = `SELECT * FROM appointments WHERE barber_id = '${barberId}' ORDER BY date_time DESC`;
  return this.executor.query<Appointment>(query, []);
}

async findByStatus(status: AppointmentStatus): Promise<Appointment[]> {
  const query = `SELECT * FROM appointments WHERE status = '${status}' ORDER BY date_time DESC`;
  return this.executor.query<Appointment>(query, []);
}

async findByCustomerIdAndStatus(customerId: string, status: AppointmentStatus): Promise<Appointment[]> {
  const query = `SELECT * FROM appointments WHERE customer_id = '${customerId}' AND status = '${status}'`;
  return this.executor.query<Appointment>(query, []);
}

async findByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
  const query = `SELECT * FROM appointments WHERE date_time >= '${startDate}' AND date_time <= '${endDate}'`;
  return this.executor.query<Appointment>(query, []);
}
```

## Attack Vectors

| Method                      | Parameter               | Payload Example                      | Impact           |
| --------------------------- | ----------------------- | ------------------------------------ | ---------------- |
| `findByCustomerId`          | `customerId`            | `' OR '1'='1' --`                    | All appointments |
| `findByBarberId`            | `barberId`              | `' OR '1'='1' --`                    | All appointments |
| `findByStatus`              | `status`                | `PENDING' OR '1'='1' --`             | All appointments |
| `findByCustomerIdAndStatus` | `customerId` + `status` | `' OR '1'='1` + `PENDING' OR '1'='1` | All appointments |
| `findByDateRange`           | `startDate`/`endDate`   | `' OR '1'='1' --`                    | All appointments |

## Secure Alternative (Same Repository)

```typescript
// SECURE: Parameterized queries
async findByCustomerIdSafe(customerId: string): Promise<Appointment[]> {
  const query = 'SELECT * FROM appointments WHERE customer_id = $1 ORDER BY date_time DESC';
  return this.executor.query<Appointment>(query, [customerId]);
}

async findByIdSafe(id: string): Promise<Appointment | null> {
  const query = 'SELECT * FROM appointments WHERE id = $1';
  const result = await this.executor.queryOne<Appointment>(query, [id]);
  return result || null;
}
```

## Impact

| Aspect              | Impact                                                                |
| ------------------- | --------------------------------------------------------------------- |
| **Confidentiality** | Full appointment data exfiltration (all customers, barbers, services) |
| **Integrity**       | Potential data manipulation via UNION/INSERT/UPDATE/DELETE            |
| **Availability**    | Potential DoS via heavy queries or DROP TABLE                         |
| **Scope**           | All appointment data across all customers/barbers                     |

## Secure Contrast

| Aspect             | Vulnerable (`VulnerableAppointmentRepository`) | Secure (`PgAppointmentRepository`) |
| ------------------ | ---------------------------------------------- | ---------------------------------- |
| Query Construction | String concatenation                           | Parameterized (`$1`, `$2`)         |
| Input Validation   | None                                           | Type-safe parameters               |
| Execution          | `executor.query(sql, [])`                      | `executor.query(sql, [params])`    |
| Injection Possible | **YES**                                        | **NO**                             |

## Detection

- **Static Analysis**: Detect string concatenation in SQL queries
- **Runtime**: WAF/IDS detecting SQL meta-characters in inputs
- **Code Review**: Search for template literals or string concat in SQL

## Remediation

1. Replace all string concatenation with parameterized queries (`$1`, `$2`, ...)
2. Use `SqlExecutor.query(sql, params[])` with typed parameters
3. Add input validation (UUID format for IDs, enum for status, ISO 8601 for
   dates)
4. Apply principle of least privilege to DB user

## Related Components

- [VulnerableAppointmentRepository](../entities/vulnerable_appointment_repository.md)
- [PgAppointmentRepository](../entities/pg_appointment_repository.md)
- [SqlExecutor](../entities/sql_executor.md)

## Test Coverage

- `packages/api-vulnerable/src/security-lab/sql-injection.test.ts` — 6 tests
  demonstrating real exploitation

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
