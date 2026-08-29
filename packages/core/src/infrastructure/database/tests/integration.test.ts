/**
 * Database integration tests.
 * Tests real PostgreSQL schema, constraints, migrations, and seed.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Pool } from 'pg';
import { setupTestDatabase, teardownTestDatabase, getTestPool, runMigrations } from './setup';
import { seed, DEV_PASSWORD } from '../seeds/seed';

describe('Database Integration Tests', () => {
  let pool: Pool;

  beforeAll(async () => {
    await setupTestDatabase();
    pool = getTestPool();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Ensure a clean schema state before each test
    await runMigrations('up');
  });

  describe('Migrations', () => {
    it('creates all expected tables', async () => {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      const tables = result.rows.map(r => r.table_name);
      expect(tables).toEqual(
        expect.arrayContaining([
          'users',
          'customers',
          'barbers',
          'services',
          'appointments',
          'transactions',
          'refresh_tokens',
        ])
      );
    });

    it('creates users table with constraints', async () => {
      const columns = await pool.query(`
        SELECT column_name, is_nullable, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      const colMap = new Map(columns.rows.map(c => [c.column_name, c]));
      expect(colMap.get('id').data_type).toBe('uuid');
      expect(colMap.get('id').is_nullable).toBe('NO');
      expect(colMap.get('id').column_default).toContain('gen_random_uuid');
      expect(colMap.get('email').is_nullable).toBe('NO');
      expect(colMap.get('password_hash').is_nullable).toBe('NO');
    });

    it('has UNIQUE constraint on users.email', async () => {
      const result = await pool.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'users'::regclass AND contype = 'u'
      `);
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('enforces CHECK constraint on users.role', async () => {
      await expect(
        pool.query(
          `INSERT INTO users (name, email, password_hash, role, status)
           VALUES ('X', 'x@x.com', 'hash', 'INVALID_ROLE', 'ACTIVE')`
        )
      ).rejects.toThrow(/violates check constraint|check.*role/i);
    });

    it('has foreign key on appointments.customer_id', async () => {
      const result = await pool.query(`
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'appointments'::regclass AND contype = 'f'
      `);
      expect(result.rows.length).toBeGreaterThanOrEqual(3);
    });

    it('can roll back and re-apply migrations', async () => {
      await runMigrations('down', 7);
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      expect(result.rows).toHaveLength(0);

      await runMigrations('up');
      const reapply = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      `);
      expect(reapply.rows).toHaveLength(1);
    });
  });

  describe('Indexes', () => {
    it('creates indexes for common queries', async () => {
      const result = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
      `);
      const indexNames = result.rows.map(r => r.indexname);
      expect(indexNames).toEqual(
        expect.arrayContaining([
          'users_email_unique_index',
          'appointments_barber_id_date_time_index',
          'appointments_customer_id_date_time_index',
          'transactions_date_index',
          'refresh_tokens_user_id_index',
        ])
      );
    });
  });

  describe('Seed', () => {
    beforeEach(async () => {
      await seed(pool);
    });

    it('creates expected number of users with roles', async () => {
      const result = await pool.query(
        'SELECT role, COUNT(*)::int AS count FROM users GROUP BY role'
      );
      const counts = Object.fromEntries(result.rows.map(r => [r.role, r.count]));
      expect(counts.ADMIN).toBe(1);
      expect(counts.BARBER).toBe(2);
      expect(counts.CUSTOMER).toBe(3);
    });

    it('creates 4 customers including a walk-in without account', async () => {
      const result = await pool.query(
        'SELECT COUNT(*)::int AS count FROM customers WHERE user_id IS NULL'
      );
      expect(result.rows[0].count).toBe(1);
      const total = await pool.query('SELECT COUNT(*)::int AS count FROM customers');
      expect(total.rows[0].count).toBe(4);
    });

    it('creates 2 barbers and 5 services', async () => {
      const barbers = await pool.query('SELECT COUNT(*)::int AS count FROM barbers');
      expect(barbers.rows[0].count).toBe(2);
      const services = await pool.query('SELECT COUNT(*)::int AS count FROM services');
      expect(services.rows[0].count).toBe(5);
    });

    it('creates 6 appointments across statuses', async () => {
      const result = await pool.query('SELECT COUNT(*)::int AS count FROM appointments');
      expect(result.rows[0].count).toBe(6);
      const statuses = await pool.query('SELECT DISTINCT status FROM appointments ORDER BY status');
      const statusList = statuses.rows.map(r => r.status);
      expect(statusList).toEqual(
        expect.arrayContaining(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])
      );
    });

    it('creates 7 transactions (4 income, 3 expense)', async () => {
      const result = await pool.query(
        'SELECT type, COUNT(*)::int AS count FROM transactions GROUP BY type'
      );
      const counts = Object.fromEntries(result.rows.map(r => [r.type, r.count]));
      expect(counts.INCOME).toBe(4);
      expect(counts.EXPENSE).toBe(3);
    });

    it('hashes development password with Argon2id', async () => {
      const result = await pool.query(
        `SELECT password_hash FROM users WHERE email = 'admin@barberlab.local'`
      );
      const hash = result.rows[0].password_hash;
      expect(hash).toMatch(/^\$argon2id\$/);
      const argon2 = await import('argon2');
      const valid = await argon2.verify(hash, DEV_PASSWORD);
      expect(valid).toBe(true);
    });

    it('is idempotent (can run twice)', async () => {
      await seed(pool);
      const users = await pool.query('SELECT COUNT(*)::int AS count FROM users');
      expect(users.rows[0].count).toBe(6);
    });
  });
});
