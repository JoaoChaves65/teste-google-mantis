import { getTestPool, resetTestDatabase, runMigrations } from '@barberlab/core/infrastructure';
import { createPasswordHasher } from '@barberlab/core/shared';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../../http/app.js';

export interface TestSetupResult {
  app: ReturnType<typeof createApp>;
  adminToken: string;
  barber1Token: string;
  barber2Token: string;
  customer1Token: string;
  customer2Token: string;
  customer3Token: string;
  adminId: string;
  barber1Id: string;
  barber2Id: string;
  customer1Id: string;
  customer2Id: string;
  customer3Id: string;
  service1Id: string;
  service2Id: string;
  service3Id: string;
  appt1Id: string;
  appt2Id: string;
  appt3Id: string;
  customer1CustId: string;
  customer2CustId: string;
  customer3CustId: string;
  barber1BarberId: string;
  barber2BarberId: string;
}

export async function setupTestEnvironment(): Promise<TestSetupResult> {
  await resetTestDatabase();
  await runMigrations('up');

  const pool = getTestPool();
  const passwordHasher = createPasswordHasher();
  const passwordHash = await passwordHasher.hash('validpassword123');

  const adminId = randomUUID();
  const barber1Id = randomUUID();
  const customer1Id = randomUUID();
  const barber2Id = randomUUID();
  const customer2Id = randomUUID();
  const customer3Id = randomUUID();

  // Create users
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      adminId,
      'Admin User',
      'admin@barberlab.local',
      passwordHash,
      'ADMIN',
      'ACTIVE',
      new Date(),
      new Date(),
    ]
  );
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      barber1Id,
      'João Barbeiro',
      'joao.barbeiro@barberlab.local',
      passwordHash,
      'BARBER',
      'ACTIVE',
      new Date(),
      new Date(),
    ]
  );
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      barber2Id,
      'Maria Barbeira',
      'maria.barbeira@barberlab.local',
      passwordHash,
      'BARBER',
      'ACTIVE',
      new Date(),
      new Date(),
    ]
  );
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      customer1Id,
      'Carlos Cliente',
      'carlos.cliente@barberlab.local',
      passwordHash,
      'CUSTOMER',
      'ACTIVE',
      new Date(),
      new Date(),
    ]
  );
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      customer2Id,
      'Ana Cliente',
      'ana.cliente@barberlab.local',
      passwordHash,
      'CUSTOMER',
      'ACTIVE',
      new Date(),
      new Date(),
    ]
  );
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      customer3Id,
      'Pedro Cliente',
      'pedro.cliente@barberlab.local',
      passwordHash,
      'CUSTOMER',
      'ACTIVE',
      new Date(),
      new Date(),
    ]
  );

  // Create barbers with ID = user_id for access check compatibility
  await pool.query(
    `INSERT INTO barbers (id, user_id, name, phone, specialty, hire_date, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO NOTHING`,
    [
      barber1Id,
      barber1Id,
      'João Barbeiro',
      '(11) 98888-1111',
      'Corte clássico',
      '2022-01-15',
      true,
      new Date(),
      new Date(),
    ]
  );
  await pool.query(
    `INSERT INTO barbers (id, user_id, name, phone, specialty, hire_date, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id) DO NOTHING`,
    [
      barber2Id,
      barber2Id,
      'Maria Barbeira',
      '(11) 98888-2222',
      'Corte feminino',
      '2023-03-01',
      true,
      new Date(),
      new Date(),
    ]
  );

  // Create customers
  await pool.query(
    `INSERT INTO customers (id, user_id, name, phone, email, birth_date, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      customer1Id,
      customer1Id,
      'Carlos Cliente',
      '(11) 99999-1111',
      'carlos.cliente@barberlab.local',
      '1990-05-15',
      'Cliente regular',
      new Date(),
      new Date(),
    ]
  );
  await pool.query(
    `INSERT INTO customers (id, user_id, name, phone, email, birth_date, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      customer2Id,
      customer2Id,
      'Ana Cliente',
      '(11) 99999-2222',
      'ana.cliente@barberlab.local',
      '1985-08-22',
      'Cliente VIP',
      new Date(),
      new Date(),
    ]
  );
  await pool.query(
    `INSERT INTO customers (id, user_id, name, phone, email, birth_date, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      customer3Id,
      customer3Id,
      'Pedro Cliente',
      '(11) 99999-3333',
      'pedro.cliente@barberlab.local',
      '1992-11-10',
      'Novo cliente',
      new Date(),
      new Date(),
    ]
  );

  // Create services
  const service1Id = randomUUID();
  const service2Id = randomUUID();
  const service3Id = randomUUID();

  await pool.query(
    `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (name) DO NOTHING`,
    [
      service1Id,
      'Corte Masculino Clássico',
      'Corte tesoura',
      45.0,
      30,
      true,
      new Date(),
      new Date(),
    ]
  );
  await pool.query(
    `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (name) DO NOTHING`,
    [service2Id, 'Barba Completa', 'Barba', 35.0, 20, true, new Date(), new Date()]
  );
  await pool.query(
    `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (name) DO NOTHING`,
    [service3Id, 'Corte + Barba', 'Combo', 70.0, 45, true, new Date(), new Date()]
  );

  // Create appointments
  const appt1Id = randomUUID();
  const appt2Id = randomUUID();
  const appt3Id = randomUUID();

  const customer1CustId = customer1Id;
  const customer2CustId = customer2Id;
  const customer3CustId = customer3Id;
  const barber1BarberId = barber1Id;
  const barber2BarberId = barber2Id;

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (customer1CustId && barber1BarberId) {
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        appt1Id,
        customer1CustId,
        barber1BarberId,
        service1Id,
        tomorrow.toISOString(),
        'PENDING',
        'Test',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        appt2Id,
        customer1CustId,
        barber1BarberId,
        service2Id,
        tomorrow.toISOString(),
        'CONFIRMED',
        'Test',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        appt3Id,
        customer1CustId,
        barber1BarberId,
        service3Id,
        tomorrow.toISOString(),
        'COMPLETED',
        'Test',
        new Date(),
        new Date(),
      ]
    );
  }

  const app = createApp();

  // Login to get tokens
  const request = (await import('supertest')).default;

  const adminLogin = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@barberlab.local', password: 'validpassword123' });
  const barber1Login = await request(app)
    .post('/auth/login')
    .send({ email: 'joao.barbeiro@barberlab.local', password: 'validpassword123' });
  const barber2Login = await request(app)
    .post('/auth/login')
    .send({ email: 'maria.barbeira@barberlab.local', password: 'validpassword123' });
  const customer1Login = await request(app)
    .post('/auth/login')
    .send({ email: 'carlos.cliente@barberlab.local', password: 'validpassword123' });
  const customer2Login = await request(app)
    .post('/auth/login')
    .send({ email: 'ana.cliente@barberlab.local', password: 'validpassword123' });
  const customer3Login = await request(app)
    .post('/auth/login')
    .send({ email: 'pedro.cliente@barberlab.local', password: 'validpassword123' });

  return {
    app,
    adminToken: adminLogin.body.accessToken,
    barber1Token: barber1Login.body.accessToken,
    barber2Token: barber2Login.body.accessToken,
    customer1Token: customer1Login.body.accessToken,
    customer2Token: customer2Login.body.accessToken,
    customer3Token: customer3Login.body.accessToken,
    adminId,
    barber1Id,
    barber2Id,
    customer1Id,
    customer2Id,
    customer3Id,
    service1Id,
    service2Id,
    service3Id,
    appt1Id,
    appt2Id,
    appt3Id,
    customer1CustId,
    customer2CustId,
    customer3CustId,
    barber1BarberId,
    barber2BarberId,
  };
}
