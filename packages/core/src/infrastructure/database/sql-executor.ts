/**
 * SQL Executor implementation using pg Pool.
 * This is the concrete implementation of the SqlExecutor interface from the domain.
 */

import type { Pool } from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';
import { getPool, transaction as dbTransaction } from './connection';
import type { SqlExecutor } from '../../persistence/interfaces';

export class PgSqlExecutor implements SqlExecutor {
  private client?: PoolClient;

  constructor(client?: PoolClient) {
    this.client = client;
  }

  getExecutor(): Pool | PoolClient {
    return this.client ?? getPool();
  }

  async query<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
    const executor = this.getExecutor();
    const result = await executor.query<T>(sql, params);
    return result.rows;
  }

  async queryOne<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T | null> {
    const executor = this.getExecutor();
    const result = await executor.query<T>(sql, params);
    return result.rows[0] ?? null;
  }

  async execute(sql: string, params: unknown[] = []): Promise<{ rowCount: number }> {
    const executor = this.getExecutor();
    const result = await executor.query(sql, params);
    return { rowCount: result.rowCount ?? 0 };
  }

  async transaction<T>(fn: (executor: SqlExecutor) => Promise<T>): Promise<T> {
    if (this.client) {
      // Already in a transaction, use nested executor
      const nestedExecutor = new PgSqlExecutor(this.client);
      return fn(nestedExecutor);
    }

    return dbTransaction(async (client: PoolClient) => {
      const txExecutor = new PgSqlExecutor(client);
      return fn(txExecutor);
    });
  }
}

export type { SqlExecutor } from '../../persistence/interfaces';
export const createSqlExecutor = (): SqlExecutor => new PgSqlExecutor();
