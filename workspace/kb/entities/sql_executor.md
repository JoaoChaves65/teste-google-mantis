<!-- KB_SNAPSHOT: snap_20250829_01 -->

# SQL Executor

## Overview

Low-level PostgreSQL query executor using `pg` driver. Provides parameterized
query execution for SQL injection prevention.

## Location

`packages/core/src/infrastructure/database/sql-executor.ts`

## Interface

```typescript
export interface SqlExecutor {
  query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[]
  ): Promise<T[]>;
  queryOne<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[]
  ): Promise<T | null>;
  execute(sql: string, params: unknown[]): Promise<{ rowCount: number }>;
  transaction<T>(callback: (executor: SqlExecutor) => Promise<T>): Promise<T>;
}
```

## Implementation

```typescript
export class PgSqlExecutor implements SqlExecutor {
  private readonly pool: Pool;

  constructor(config?: PoolConfig) {
    this.pool = new Pool(config);
  }

  getExecutor(): Pool {
    return this.pool;
  }

  async query<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const result = await this.pool.query<T>(sql, params);
    return result.rows;
  }

  async queryOne<T extends Record<string, unknown>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const result = await this.pool.query<T>(sql, params);
    return result.rows[0] ?? null;
  }

  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<{ rowCount: number }> {
    const result = await this.pool.query(sql, params);
    return { rowCount: result.rowCount ?? 0 };
  }

  async transaction<T>(
    callback: (executor: SqlExecutor) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    const txExecutor = new PgSqlExecutor(client);
    try {
      await client.query('BEGIN');
      const result = await callback(txExecutor);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
```

## Security Features

- **Parameterized queries only** — no string concatenation in SQL
- **Type-safe parameters** — `params: unknown[]` array
- **Transaction support** — automatic BEGIN/COMMIT/ROLLBACK
- **Connection pooling** — managed by `pg` Pool

## Vulnerable Contrast

See [Vulnerable Appointment Repository](vulnerable_appointment_repository.md)
for the intentionally vulnerable implementation using string concatenation.

---

_Last updated: Pass 1 — KB_SNAPSHOT: snap_20250829_01_
