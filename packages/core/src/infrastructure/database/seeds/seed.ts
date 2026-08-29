/**
 * Development seed script.
 * Creates deterministic test data for development and testing.
 *
 * IMPORTANT: Passwords are development-only and should NEVER be used in production.
 * All passwords are hashed with Argon2id.
 */

import argon2 from 'argon2';
import { createPool, closePool } from '../connection';
import type { PoolClient } from 'pg';

export const DEV_PASSWORD = 'dev123456'; // Development-only password

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

type DbClient = Pick<PoolClient, 'query'>;

async function insertRows(client: DbClient, rows: unknown[][], sql: string): Promise<string[]> {
  const ids: string[] = [];
  for (const row of rows) {
    const result = await client.query(sql, row);
    ids.push(result.rows[0].id);
  }
  return ids;
}

export async function seed(executor: DbClient = createPool()): Promise<void> {
  console.log('[Seed] Starting database seed...');

  // Hash the development password
  const passwordHash = await hashPassword(DEV_PASSWORD);
  console.log('[Seed] Password hashed with Argon2id');

  const run = async (client: DbClient): Promise<void> => {
    // Clear existing data (in reverse dependency order)
    await client.query('DELETE FROM refresh_tokens');
    await client.query('DELETE FROM transactions');
    await client.query('DELETE FROM appointments');
    await client.query('DELETE FROM services');
    await client.query('DELETE FROM barbers');
    await client.query('DELETE FROM customers');
    await client.query('DELETE FROM users');
    console.log('[Seed] Cleared existing data');

    // ============================================
    // USERS
    // ============================================
    const usersSql = `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`;
    const userRows: unknown[][] = [
      ['Admin User', 'admin@barberlab.local', passwordHash, 'ADMIN', 'ACTIVE'],
      ['João Barbeiro', 'joao.barbeiro@barberlab.local', passwordHash, 'BARBER', 'ACTIVE'],
      ['Maria Barbeira', 'maria.barbeira@barberlab.local', passwordHash, 'BARBER', 'ACTIVE'],
      ['Carlos Cliente', 'carlos.cliente@barberlab.local', passwordHash, 'CUSTOMER', 'ACTIVE'],
      ['Ana Cliente', 'ana.cliente@barberlab.local', passwordHash, 'CUSTOMER', 'ACTIVE'],
      ['Pedro Cliente', 'pedro.cliente@barberlab.local', passwordHash, 'CUSTOMER', 'ACTIVE'],
    ];
    const userIds = await insertRows(client, userRows, usersSql);
    const [
      adminUserId,
      barberUser1Id,
      barberUser2Id,
      customerUser1Id,
      customerUser2Id,
      customerUser3Id,
    ] = userIds;
    console.log('[Seed] Created admin user:', adminUserId);

    // ============================================
    // CUSTOMERS
    // ============================================
    const customersSql = `INSERT INTO customers (user_id, name, phone, email, birth_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`;
    const customerRows: unknown[][] = [
      [
        customerUser1Id,
        'Carlos Cliente',
        '(11) 99999-1111',
        'carlos.cliente@barberlab.local',
        '1990-05-15',
        'Cliente regular, prefere corte clássico',
      ],
      [
        customerUser2Id,
        'Ana Cliente',
        '(11) 99999-2222',
        'ana.cliente@barberlab.local',
        '1985-08-22',
        'Cliente VIP, agenda quinzenalmente',
      ],
      [
        customerUser3Id,
        'Pedro Cliente',
        '(11) 99999-3333',
        'pedro.cliente@barberlab.local',
        '1992-12-10',
        'Novo cliente, primeira visita',
      ],
      [
        null,
        'Lucas Sem Conta',
        '(11) 99999-4444',
        'lucas.semconta@email.com',
        '1988-03-20',
        'Cliente walk-in, sem conta cadastrada',
      ],
    ];
    const customerIds = await insertRows(client, customerRows, customersSql);
    const [customer1Id, customer2Id, customer3Id, customer4Id] = customerIds;
    console.log('[Seed] Created customers');

    // ============================================
    // BARBERS
    // ============================================
    const barbersSql = `INSERT INTO barbers (user_id, name, phone, specialty, hire_date, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`;
    const barberRows: unknown[][] = [
      [
        barberUser1Id,
        'João Barbeiro',
        '(11) 98888-1111',
        'Corte clássico e barba',
        '2022-01-15',
        true,
      ],
      [
        barberUser2Id,
        'Maria Barbeira',
        '(11) 98888-2222',
        'Corte feminino e coloração',
        '2023-03-01',
        true,
      ],
    ];
    const barberIds = await insertRows(client, barberRows, barbersSql);
    const [barber1Id, barber2Id] = barberIds;
    console.log('[Seed] Created barbers');

    // ============================================
    // SERVICES
    // ============================================
    const servicesSql = `INSERT INTO services (name, description, price, duration_minutes, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`;
    const serviceRows: unknown[][] = [
      [
        'Corte Masculino Clássico',
        'Corte tesoura e máquina, finalização com pomada',
        45.0,
        30,
        true,
      ],
      ['Barba Completa', 'Aparar, modelar e hidratar barba', 35.0, 20, true],
      ['Corte + Barba', 'Combo corte clássico + barba completa', 70.0, 45, true],
      ['Corte Feminino', 'Corte tesoura, modelagem e finalização', 80.0, 60, true],
      ['Coloração', 'Coloração completa ou retoque de raiz', 120.0, 90, true],
    ];
    const serviceIds = await insertRows(client, serviceRows, servicesSql);
    const [service1Id, service2Id, service3Id, service4Id, service5Id] = serviceIds;
    console.log('[Seed] Created services');

    // ============================================
    // APPOINTMENTS
    // ============================================
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const appointmentsSql = `INSERT INTO appointments (customer_id, barber_id, service_id, date_time, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`;
    const appointmentRows: unknown[][] = [
      [
        customer1Id,
        barber1Id,
        service1Id,
        tomorrow.toISOString(),
        'PENDING',
        'Primeiro horário da manhã',
      ],
      [
        customer2Id,
        barber2Id,
        service4Id,
        new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        'CONFIRMED',
        'Cliente confirmou via WhatsApp',
      ],
      [
        customer3Id,
        barber1Id,
        service3Id,
        new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        'PENDING',
        '',
      ],
      [customer1Id, barber1Id, service2Id, lastWeek.toISOString(), 'COMPLETED', 'Barba bem feita'],
      [
        customer2Id,
        barber2Id,
        service5Id,
        new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        'COMPLETED',
        'Coloração retocada',
      ],
      [
        customer4Id,
        barber1Id,
        service1Id,
        yesterday.toISOString(),
        'CANCELLED',
        'Cliente não compareceu',
      ],
    ];
    for (const row of appointmentRows) {
      await client.query(appointmentsSql, row);
    }
    console.log('[Seed] Created appointments');

    // ============================================
    // TRANSACTIONS
    // ============================================
    const transactionsSql = `INSERT INTO transactions (type, category, amount, description, date, appointment_id, barber_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    const transactionsSqlNoAppointment = `INSERT INTO transactions (type, category, amount, description, date, barber_id)
       VALUES ($1, $2, $3, $4, $5, $6)`;
    const lastWeekDay = lastWeek.toISOString().split('T')[0];
    const lastWeekPlus2 = new Date(lastWeek.getTime() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const nowDay = now.toISOString().split('T')[0];

    const incomeRows: unknown[][] = [
      [
        'INCOME',
        'Corte',
        45.0,
        'Corte masculino clássico - Carlos Cliente',
        lastWeekDay,
        null,
        barber1Id,
      ],
      ['INCOME', 'Barba', 35.0, 'Barba completa - Carlos Cliente', lastWeekDay, null, barber1Id],
      [
        'INCOME',
        'Corte Feminino',
        80.0,
        'Corte feminino - Ana Cliente',
        lastWeekPlus2,
        null,
        barber2Id,
      ],
      ['INCOME', 'Coloração', 120.0, 'Coloração - Ana Cliente', lastWeekPlus2, null, barber2Id],
    ];
    for (const row of incomeRows) {
      await client.query(transactionsSql, row);
    }

    const expenseRows: unknown[][] = [
      ['EXPENSE', 'Produtos', 150.0, 'Compra de shampoos e pomadas', nowDay, null],
      ['EXPENSE', 'Aluguel', 2000.0, 'Aluguel do espaço - Maio', nowDay, null],
      ['EXPENSE', 'Marketing', 300.0, 'Anúncios Instagram', nowDay, null],
    ];
    for (const row of expenseRows) {
      await client.query(transactionsSqlNoAppointment, row);
    }
    console.log('[Seed] Created transactions');
  };

  // If a Pool is provided, run the seed inside a transaction using that pool.
  // Otherwise run directly against the provided client (e.g. test PoolClient).
  const isPool = typeof (executor as { connect?: unknown }).connect === 'function';
  if (isPool) {
    const pool = executor as unknown as {
      connect: () => Promise<PoolClient>;
    };
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await run(client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    await run(executor);
  }

  console.log('[Seed] Seed completed successfully!');
  console.log('');
  console.log('===========================================');
  console.log('DEVELOPMENT CREDENTIALS (DO NOT USE IN PROD)');
  console.log('===========================================');
  console.log('Password for all users: dev123456');
  console.log('');
  console.log('Admin: admin@barberlab.local');
  console.log('Barbers: joao.barbeiro@barberlab.local, maria.barbeira@barberlab.local');
  console.log(
    'Customers: carlos.cliente@barberlab.local, ana.cliente@barberlab.local, pedro.cliente@barberlab.local'
  );
  console.log('===========================================');
}

// Run directly when executed as a script (not imported).
const isMain =
  typeof require !== 'undefined' && typeof require.main !== 'undefined' && require.main === module;

if (isMain) {
  seed()
    .then(() => {
      console.log('[Seed] Process completed');
      return closePool();
    })
    .catch(error => {
      console.error('[Seed] Error:', error);
      return closePool().then(() => process.exit(1));
    });
}
