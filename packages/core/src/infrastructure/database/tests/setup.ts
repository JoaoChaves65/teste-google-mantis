/**
 * Test database setup and teardown.
 * Creates an isolated test database for integration tests.
 */

import { Client, Pool } from 'pg';
import { runner } from 'node-pg-migrate';
import type { Pool as PoolType } from 'pg';

let testPool: PoolType | null = null;

export const getTestDatabaseConfig = () => ({
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  database: process.env.TEST_DB_NAME || 'barberlab_test',
  user: process.env.TEST_DB_USER || 'barberlab',
  password: process.env.TEST_DB_PASSWORD || 'changeme',
});

export const createTestPool = (): Pool => {
  if (testPool) return testPool;
  testPool = new Pool(getTestDatabaseConfig());
  return testPool;
};

export const getTestPool = (): Pool => {
  if (!testPool) return createTestPool();
  return testPool;
};

export const closeTestPool = async (): Promise<void> => {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
};

export const runMigrations = async (
  direction: 'up' | 'down' = 'up',
  steps?: number
): Promise<void> => {
  const config = getTestDatabaseConfig();
  const client = new Client(config);
  await client.connect();

  try {
    await runner({
      dbClient: client,
      dir: __dirname + '/../migrations',
      migrationsTable: 'migrations',
      direction,
      count: steps,
      checkOrder: true,
      verbose: false,
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        debug: () => undefined,
      },
    });
  } finally {
    await client.end();
  }
};

export const resetTestDatabase = async (): Promise<void> => {
  const pool = getTestPool();
  await pool.query(`
    DROP TABLE IF EXISTS refresh_tokens CASCADE;
    DROP TABLE IF EXISTS transactions CASCADE;
    DROP TABLE IF EXISTS appointments CASCADE;
    DROP TABLE IF EXISTS services CASCADE;
    DROP TABLE IF EXISTS barbers CASCADE;
    DROP TABLE IF EXISTS customers CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS migrations CASCADE;
  `);
};

export const setupTestDatabase = async (): Promise<void> => {
  await resetTestDatabase();
  await runMigrations('up');
};

export const teardownTestDatabase = async (): Promise<void> => {
  await resetTestDatabase();
  await closeTestPool();
};
