<!-- KB_SNAPSHOT: snap_20250829_01 -->

# PgAppointmentRepository

## Overview

PostgreSQL implementation of the `AppointmentRepository` interface using
parameterized queries for SQL injection prevention.

## Location

`packages/core/src/infrastructure/database/repositories/appointment-repository.ts`

## Implementation

### Constructor

```typescript
export class PgAppointmentRepository implements AppointmentRepository {
  constructor(private readonly executor: SqlExecutor) {}
```

### Method: `findById`

```typescript
async findById(id: string): Promise<Appointment | null> {
  const query = 'SELECT * FROM appointments WHERE id = $1';
  const result = await this.executor.queryOne<Appointment>(query, [id]);
  return result || null;
}
```

### Method: `findAll` (with pagination)

```typescript
async findAll(params: PaginationParams): Promise<PaginatedResponse<Appointment>> {
  const { page, limit } = validatePagination(params);
  const offset = (page - 1) * limit;

  const [dataRows, countRow] = await Promise.all([
    this.executor.query<Appointment>(
      `SELECT * FROM appointments ORDER BY date_time ASC LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    this.executor.queryOne<{ count: string }>('SELECT COUNT(*) FROM appointments', []),
  ]);

  const data = dataRows.map(this.mapRow);
  const total = parseInt(countRow?.count || '0', 10);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
```

### Method: `create`

```typescript
async create(appointment: Appointment): Promise<Appointment> {
  const query = `
    INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
    RETURNING *
  `;
  const result = await this.executor.queryOne<Appointment>(query, [
    appointment.id,
    appointment.customerId,
    appointment.barberId,
    appointment.serviceId,
    appointment.dateTime,
    appointment.status,
    appointment.notes || null,
    new Date(),
  ]);
  if (!result) throw new Error('Failed to create appointment');
  return result;
}
```

### Method: `update`

```typescript
async update(appointment: Appointment): Promise<Appointment> {
  const query = `
    UPDATE appointments
    SET status = $1, notes = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `;
  const result = await this.executor.queryOne<Appointment>(query, [
    appointment.status,
    appointment.notes || null,
    appointment.id,
  ]);
  if (!result) throw new Error('Failed to update appointment');
  return result;
}
```

### Method: `delete`

```typescript
async delete(id: string): Promise<void> {
  const query = 'DELETE FROM appointments WHERE id = $1';
  await this.executor.query(query, [id]);
}
```

### Row Mapping

```typescript
protected mapRow(row: Record<string, unknown>): Appointment {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    barberId: row.barber_id as string,
    serviceId: row.service_id as string,
    dateTime: row.date_time as Date,
    status: row.status as AppointmentStatus,
    notes: row.notes as string | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}
```

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
