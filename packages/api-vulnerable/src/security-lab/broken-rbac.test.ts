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

describe('Security Lab - Broken RBAC', () => {
  let app: ReturnType<typeof createApp>;
  let pool: ReturnType<typeof getTestPool>;
  let customerToken: string;
  let barberToken: string;
  let adminToken: string;

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

    // Create Barber
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        randomUUID(),
        'Barber Test',
        'barber@test.com',
        passwordHash,
        'BARBER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );

    // Create Admin
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        randomUUID(),
        'Admin Test',
        'admin@test.com',
        passwordHash,
        'ADMIN',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );

    // Login and get tokens
    const customerLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'customer@test.com', password: 'validpassword123' });
    customerToken = customerLogin.body.accessToken;

    const barberLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'barber@test.com', password: 'validpassword123' });
    barberToken = barberLogin.body.accessToken;

    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'validpassword123' });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('Customer -> Admin Endpoints', () => {
    it('VULNERÁVEL: Customer consegue acessar GET /api/v1/users (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200); // VULNERÁVEL: Retorna 200 em vez de 403

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('VULNERÁVEL: Customer consegue acessar GET /api/v1/transactions (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200); // VULNERÁVEL: Retorna 200 em vez de 403

      expect(response.body.data).toBeDefined();
    });

    it('VULNERÁVEL: Customer consegue acessar POST /api/v1/users (admin only)', async () => {
      const response = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test User',
          email: 'test@test.com',
          password: 'password123',
          role: 'CUSTOMER',
        })
        .expect(201); // VULNERÁVEL: Retorna 201 em vez de 403

      expect(response.body.id).toBeDefined();
    });
  });

  describe('Barber -> Admin Endpoints', () => {
    it('VULNERÁVEL: Barber consegue acessar GET /api/v1/users (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${barberToken}`)
        .expect(200); // VULNERÁVEL: Retorna 200 em vez de 403

      expect(response.body.data).toBeDefined();
    });

    it('VULNERÁVEL: Barber consegue acessar POST /api/v1/services (admin only)', async () => {
      const response = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${barberToken}`)
        .send({
          name: 'Test Service',
          price: '50.00',
          durationMinutes: 30,
        })
        .expect(201); // VULNERÁVEL: Retorna 201 em vez de 403

      expect(response.body.id).toBeDefined();
    });

    it('VULNERÁVEL: Barber consegue acessar POST /api/v1/barbers (admin only)', async () => {
      const response = await request(app)
        .post('/api/v1/barbers')
        .set('Authorization', `Bearer ${barberToken}`)
        .send({
          name: 'Test Barber RBAC',
          phone: '(11) 99999-9999',
          specialty: 'Test',
          hireDate: '2024-01-01T00:00:00Z',
        })
        .expect(201); // VULNERÁVEL: Retorna 201 em vez de 403

      expect(response.body.id).toBeDefined();
    });

    it('VULNERÁVEL: Barber consegue acessar GET /api/v1/transactions (admin only)', async () => {
      const response = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${barberToken}`)
        .expect(200); // VULNERÁVEL: Retorna 200 em vez de 403

      expect(response.body.data).toBeDefined();
    });
  });

  describe('Customer -> Admin Endpoints (Additional)', () => {
    it('VULNERÁVEL: Customer consegue acessar POST /api/v1/barbers (admin only)', async () => {
      const response = await request(app)
        .post('/api/v1/barbers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: 'Test Barber',
          phone: '(11) 99999-9999',
          specialty: 'Test',
          hireDate: '2024-01-01T00:00:00Z',
        })
        .expect(201); // VULNERÁVEL: Retorna 201 em vez de 403

      expect(response.body.id).toBeDefined();
    });

    it('VULNERÁVEL: Customer consegue acessar POST /api/v1/services (admin only)', async () => {
      const response = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          name: `Test Service ${Date.now()}`,
          price: '50.00',
          durationMinutes: 30,
        })
        .expect(201); // VULNERÁVEL: Retorna 201 em vez de 403

      expect(response.body.id).toBeDefined();
    });
  });

  describe('Admin -> All Endpoints (Should Work)', () => {
    it('Admin consegue acessar todos os endpoints', async () => {
      const usersResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const transactionsResponse = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const createServiceResponse = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Service Admin',
          price: '50.00',
          durationMinutes: 30,
        })
        .expect(201);

      expect(usersResponse.body.data).toBeDefined();
      expect(transactionsResponse.body.data).toBeDefined();
      expect(createServiceResponse.body.id).toBeDefined();
    });
  });

  describe('Secure Contrast', () => {
    it('SECURE: Customer NÃO deve acessar endpoints admin na API Secure', async () => {
      // Este teste documenta o comportamento esperado na API Secure
      // Na API Secure, o mesmo cenário deve retornar 403
      expect(true).toBe(true);
    });
  });
});
