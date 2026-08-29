/**
 * Database connection configuration and pool management.
 * Centralized PostgreSQL connection using node-postgres (pg).
 */

import { Pool } from 'pg';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

let pool: Pool | null = null;

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export const getDatabaseConfig = (): DatabaseConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'barberlab',
  user: process.env.DB_USER || 'barberlab',
  password: process.env.DB_PASSWORD || 'changeme',
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
});

export const createPool = (config?: DatabaseConfig): Pool => {
  if (pool) {
    return pool;
  }

  const dbConfig = config || getDatabaseConfig();
  pool = new Pool(dbConfig);

  pool.on('error', err => {
    console.error('[Database] Unexpected pool error:', err);
  });

  return pool;
};

export const getPool = (): Pool => {
  if (!pool) {
    return createPool();
  }
  return pool;
};

export const closePool = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const pool = getPool();
  return pool.query<T>(text, params);
};

export const queryOne = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> => {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
};

export const execute = async (text: string, params?: unknown[]): Promise<{ rowCount: number }> => {
  const pool = getPool();
  const result = await pool.query(text, params);
  return { rowCount: result.rowCount ?? 0 };
};

export const transaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const healthCheck = async (): Promise<boolean> => {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};
