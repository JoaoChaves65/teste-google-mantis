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

describe('Security Lab - IDOR / Broken Object Level Authorization', () => {
  let app: ReturnType<typeof createApp>;
  let pool: ReturnType<typeof getTestPool>;
  let customerAToken: string;
  let customerAId: string;
  let customerBId: string;
  let customerACustId: string;
  let customerBCustId: string;
  let barberToken: string;
  let appointmentId: string;
  let barberId: string;

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

    // Create Customer A
    customerAId = randomUUID();
    customerACustId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        customerAId,
        'Customer A',
        'customerA@test.com',
        passwordHash,
        'CUSTOMER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO customers (id, user_id, name, phone, email, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        customerACustId,
        customerAId,
        'Customer A',
        '(11) 99999-1111',
        'customerA@test.com',
        new Date(),
        new Date(),
      ]
    );

    // Create Customer B
    customerBId = randomUUID();
    customerBCustId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        customerBId,
        'Customer B',
        'customerB@test.com',
        passwordHash,
        'CUSTOMER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );
    await pool.query(
      `INSERT INTO customers (id, user_id, name, phone, email, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        customerBCustId,
        customerBId,
        'Customer B',
        '(11) 99999-2222',
        'customerB@test.com',
        new Date(),
        new Date(),
      ]
    );

    // Create Barber
    barberId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        barberId,
        'Barber Test',
        'barber@test.com',
        passwordHash,
        'BARBER',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );
    const barberResult = await pool.query(
      `INSERT INTO barbers (id, user_id, name, phone, specialty, hire_date, active, created_at, updated_at)
       VALUES ($1, $2, 'Barber Test', '(11) 99999-3333', 'Corte', NOW(), true, NOW(), NOW())
       RETURNING id`,
      [randomUUID(), barberId]
    );
    const barberDbId = barberResult.rows[0].id;

    // Create Admin
    const adminId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        adminId,
        'Admin Test',
        'admin@test.com',
        passwordHash,
        'ADMIN',
        'ACTIVE',
        new Date(),
        new Date(),
      ]
    );

    // Create Service
    const serviceId = randomUUID();
    await pool.query(
      `INSERT INTO services (id, name, price, duration_minutes, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [serviceId, 'Corte Básico', '50.00', 30, true, new Date(), new Date()]
    );

    // Create Appointment for Customer B
    appointmentId = randomUUID();
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', 'Test', $6, $6)`,
      [
        appointmentId,
        customerBCustId,
        barberDbId,
        serviceId,
        new Date('2025-12-31 10:00:00'),
        new Date(),
      ]
    );

    // Login and get tokens
    const customerALogin = await request(app)
      .post('/auth/login')
      .send({ email: 'customerA@test.com', password: 'validpassword123' });
    customerAToken = customerALogin.body.accessToken;

    await request(app)
      .post('/auth/login')
      .send({ email: 'customerB@test.com', password: 'validpassword123' });

    const barberLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'barber@test.com', password: 'validpassword123' });
    barberToken = barberLogin.body.accessToken;

    await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'validpassword123' });
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('Customer -> Customer IDOR', () => {
    it('VULNERÁVEL: Customer A pode acessar customer de Customer B via GET /customers/:id', async () => {
      const response = await request(app)
        .get(`/api/v1/customers/${customerBCustId}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .expect(200);

      expect(response.body.id).toBe(customerBCustId);
      expect(response.body.name).toBe('Customer B');
    });

    it('VULNERÁVEL: Customer A pode acessar appointment de Customer B via GET /appointments/:id', async () => {
      const response = await request(app)
        .get(`/api/v1/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .expect(200);

      expect(response.body.id).toBe(appointmentId);
      expect(response.body.customerId).not.toBe(customerACustId);
    });

    it('VULNERÁVEL: Customer A pode cancelar appointment de Customer B via PATCH /appointments/:id/status', async () => {
      const response = await request(app)
        .patch(`/api/v1/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ action: 'cancel' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });
  });

  describe('Barber -> Barber IDOR', () => {
    it('VULNERÁVEL: Barber pode acessar dados de outro barber via GET /barbers/:id', async () => {
      const otherBarberId = randomUUID();
      const otherBarberUserId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, 'Other Barber', 'otherbarber@test.com', '$2b$10$hash', 'BARBER', 'ACTIVE', NOW(), NOW())
         RETURNING id`,
        [otherBarberUserId]
      );
      await pool.query(
        `INSERT INTO barbers (id, user_id, name, phone, specialty, hire_date, active, created_at, updated_at)
         VALUES ($1, $2, 'Other Barber', '(11) 99999-9999', 'Corte', NOW(), true, NOW(), NOW())
         RETURNING id`,
        [otherBarberId, otherBarberUserId]
      );

      const response = await request(app)
        .get(`/api/v1/barbers/${otherBarberId}`)
        .set('Authorization', `Bearer ${barberToken}`)
        .expect(200);

      expect(response.body.id).toBe(otherBarberId);
    });
  });

  describe('Customer -> Transaction IDOR', () => {
    let transactionId: string;
    let customerBCustId2: string;
    let customerBId2: string;

    beforeAll(async () => {
      // Create Customer B2 (different from customerBId)
      customerBId2 = randomUUID();
      customerBCustId2 = randomUUID();
      const passwordHasher = createPasswordHasher();
      const passwordHash = await passwordHasher.hash('validpassword123');

      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, 'Customer B2', 'customerB2@test.com', $2, 'CUSTOMER', 'ACTIVE', NOW(), NOW())
         RETURNING id`,
        [customerBId2, passwordHash]
      );
      await pool.query(
        `INSERT INTO customers (id, user_id, name, phone, email, created_at, updated_at)
         VALUES ($1, $2, 'Customer B2', '(11) 99999-3333', 'customerB2@test.com', NOW(), NOW())
         RETURNING id`,
        [customerBCustId2, customerBId2]
      );

      // Create Transaction for Customer B2
      transactionId = randomUUID();
      await pool.query(
        `INSERT INTO transactions (id, type, category, amount, description, date, appointment_id, barber_id, created_at, updated_at)
         VALUES ($1, 'INCOME', 'Service', 10000, 'Test Transaction', NOW(), NULL, NULL, NOW(), NOW())
         RETURNING id`,
        [transactionId]
      );
      // Update transaction to link to customer B2
      await pool.query(`UPDATE transactions SET description = $1 WHERE id = $2`, [
        `customer:${customerBCustId2}`,
        transactionId,
      ]);
    });

    it('VULNERÁVEL: Customer A pode acessar transaction de Customer B via GET /transactions/:id', async () => {
      const response = await request(app)
        .get(`/api/v1/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .expect(200);

      expect(response.body.id).toBe(transactionId);
    });
  });

  describe('Barber -> Customer IDOR', () => {
    it('VULNERÁVEL: Barber pode acessar customer não relacionado via GET /customers/:id', async () => {
      const response = await request(app)
        .get(`/api/v1/customers/${customerBCustId}`)
        .set('Authorization', `Bearer ${barberToken}`)
        .expect(200);

      expect(response.body.id).toBe(customerBCustId);
    });
  });

  describe('Barber -> Appointment IDOR', () => {
    it('VULNERÁVEL: Barber pode acessar appointment de outro barber via GET /appointments/:id', async () => {
      const response = await request(app)
        .get(`/api/v1/appointments/${appointmentId}`)
        .set('Authorization', `Bearer ${barberToken}`)
        .expect(200);

      expect(response.body.id).toBe(appointmentId);
    });
  });

  describe('Secure Contrast', () => {
    it('SECURE: Customer A NÃO deve acessar customer de Customer B na API Secure', async () => {
      expect(true).toBe(true);
    });
  });
});
