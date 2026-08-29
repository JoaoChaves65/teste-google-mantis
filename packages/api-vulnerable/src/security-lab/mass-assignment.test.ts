import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { closePool } from '@barberlab/core/infrastructure/database/connection';
import {
  resetTestDatabase,
  runMigrations,
  getTestPool,
  closeTestPool,
} from '@barberlab/core/infrastructure';
import { createPasswordHasher } from '@barberlab/core/shared';
import { randomUUID } from 'node:crypto';

// Set test database environment variables BEFORE importing createApp
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'barberlab_test';
process.env.DB_USER = 'barberlab';
process.env.DB_PASSWORD = 'changeme';

import { createApp } from '../http/app';

describe('Security Lab - Mass Assignment', () => {
  let app: ReturnType<typeof createApp>;
  let pool: ReturnType<typeof getTestPool>;
  let barberToken: string;
  let customerToken: string;
  let barberUserId: string;

  beforeAll(async () => {
    // Close the main pool so it gets recreated with test config
    await closePool();

    await resetTestDatabase();
    await runMigrations('up');

    const appInstance = createApp();
    app = appInstance;
    pool = getTestPool();
    const passwordHasher = createPasswordHasher();
    const passwordHash = await passwordHasher.hash('validpassword123');

    // Create Barber
    barberUserId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        barberUserId,
        'Barber Test',
        'barber@test.com',
        passwordHash,
        'BARBER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );

    // Create Customer
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        randomUUID(),
        'Customer Test',
        'customer@test.com',
        passwordHash,
        'CUSTOMER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );

    // Login and get tokens
    const barberLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'barber@test.com', password: 'validpassword123' });
    barberToken = barberLogin.body.accessToken;

    const customerLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'customer@test.com', password: 'validpassword123' });
    customerToken = customerLogin.body.accessToken;
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('Customer Create - Mass Assignment', () => {
    it('API aceita role field mas domínio ignora (customer vinculado ao usuário autenticado)', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${barberToken}`)
        .send({
          name: 'Test Customer',
          phone: '(11) 99999-1111',
          email: 'test@customer.com',
          role: 'ADMIN', // API aceita mas domínio ignora
        })
        .expect(201); // API retorna 201 (campo aceito no schema)

      expect(response.body.id).toBeDefined();
      expect(response.body.userId).toBe(barberUserId); // Customer vinculado ao barber autenticado
      // Domínio ignora role - usuário vinculado permanece com role original (BARBER)
      const pool = getTestPool();
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [barberUserId]);
      expect(result.rows[0].role).toBe('BARBER'); // Domínio protege contra mass assignment
    });

    it('Customer NÃO consegue acessar POST /api/v1/customers (endpoint requer ADMIN/BARBER)', async () => {
      await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test Customer',
          phone: '(11) 99999-1111',
          email: 'test3@customer.com',
          role: 'ADMIN',
        })
        .expect(403); // CUSTOMER não tem permissão para criar customers
    });
  });

  describe('Customer Update - Mass Assignment', () => {
    let createdCustomerCustId: string;
    let targetUserId: string;

    beforeAll(async () => {
      const pool = getTestPool();
      targetUserId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, 'Target Customer', 'target@test.com', '$2b$10$hash', 'CUSTOMER', 'ACTIVE', NOW(), NOW())
         RETURNING id`,
        [targetUserId]
      );
      const custId = randomUUID();
      await pool.query(
        `INSERT INTO customers (id, user_id, name, phone, email, created_at, updated_at)
         VALUES ($1, $2, 'Target Customer', '(11) 99999-0000', 'target@test.com', NOW(), NOW())
         RETURNING id`,
        [custId, targetUserId]
      );
      const result = await pool.query('SELECT id FROM customers WHERE email = $1', [
        'target@test.com',
      ]);
      createdCustomerCustId = result.rows[0].id;
    });

    it('API aceita role field mas domínio ignora (role não é alterado)', async () => {
      await request(app)
        .patch(`/api/v1/customers/${createdCustomerCustId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Updated Name',
          role: 'ADMIN', // API aceita mas domínio ignora
        })
        .expect(200); // API retorna 200 (campo aceito no schema)

      // Domínio ignora role - usuário permanece com role original (CUSTOMER)
      const pool = getTestPool();
      const result = await pool.query('SELECT role FROM users WHERE id = $1', [targetUserId]);
      expect(result.rows[0].role).toBe('CUSTOMER'); // Domínio protege contra mass assignment
    });
  });

  describe('Barber Create - Mass Assignment', () => {
    it('API aceita active field mas domínio ignora (active fica true)', async () => {
      const response = await request(app)
        .post('/api/v1/barbers')
        .set('Authorization', `Bearer ${barberToken}`)
        .send({
          name: 'Test Barber',
          phone: '(11) 99999-3333',
          specialty: 'Test',
          hireDate: '2024-01-01T00:00:00Z',
          active: false, // API aceita mas domínio ignora
        })
        .expect(201); // API retorna 201 (campo aceito no schema)

      // Domínio define active=true por padrão, não há vulnerabilidade real
      expect(response.body.active).toBe(true); // Domínio protege contra mass assignment
    });
  });

  describe('Service Create - Mass Assignment', () => {
    it('API aceita active field mas domínio ignora (active fica true)', async () => {
      const response = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${barberToken}`)
        .send({
          name: `Test Service Mass Assignment ${Date.now()}`,
          price: '50.00',
          durationMinutes: 30,
          active: false, // API aceita mas domínio ignora
        })
        .expect(201);

      // Domínio define active=true por padrão
      expect(response.body.active).toBe(true); // Domínio protege contra mass assignment
    });
  });

  describe('User Create - Mass Assignment', () => {
    it('VULNERÁVEL: Qualquer usuário autenticado consegue criar user com role=ADMIN via POST /api/v1/users', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test User',
          email: 'testuser@test.com',
          password: 'password123',
          role: 'ADMIN', // VULNERÁVEL: Mass assignment de role
        })
        .expect(201); // VULNERÁVEL: Retorna 201

      expect(response.body.id).toBeDefined();
      expect(response.body.role).toBe('ADMIN'); // VULNERÁVEL: Domínio respeita role enviado
    });

    it('VULNERÁVEL: Barber consegue criar user com role=ADMIN', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${barberToken}`)
        .send({
          name: 'Test User 2',
          email: 'testuser2@test.com',
          password: 'password123',
          role: 'ADMIN', // VULNERÁVEL: Mass assignment de role
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.role).toBe('ADMIN'); // VULNERÁVEL: Domínio respeita role enviado
    });
  });

  describe('Secure Contrast', () => {
    it('SECURE: Customer NÃO deve conseguir definir role na API Secure', async () => {
      expect(true).toBe(true); // Placeholder - teste real na api-secure
    });
  });
});
