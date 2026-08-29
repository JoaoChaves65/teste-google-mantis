/* eslint-disable @typescript-eslint/consistent-type-imports */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { setupTestEnvironment } from './test-utils';
import { getTestPool } from '@barberlab/core/infrastructure';
import { randomUUID } from 'node:crypto';

describe('Transactions API - /api/v1/transactions', () => {
  let app: ReturnType<typeof import('../../../http/app').createApp>;
  let customer1Token: string;
  let barber1Token: string;
  let adminToken: string;
  let incomeTransactionId: string;
  let expenseTransactionId: string;
  let testAppointmentId: string;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    app = setup.app;
    customer1Token = setup.customer1Token;
    barber1Token = setup.barber1Token;
    adminToken = setup.adminToken;

    // Create test transactions and appointment
    const pool = getTestPool();
    const tomorrow = new Date().toISOString();

    // Create a test appointment for appointmentId tests
    testAppointmentId = randomUUID();
    await pool.query(
      `INSERT INTO appointments (id, customer_id, barber_id, service_id, date_time, status, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        testAppointmentId,
        setup.customer1CustId,
        setup.barber1BarberId,
        setup.service1Id,
        tomorrow,
        'COMPLETED',
        'Test appointment',
        new Date(),
        new Date(),
      ]
    );

    // Create income transaction
    incomeTransactionId = randomUUID();
    await pool.query(
      `INSERT INTO transactions (id, type, category, amount, description, date, appointment_id, barber_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        incomeTransactionId,
        'INCOME',
        'Corte',
        '45.00',
        'Teste income',
        new Date().toISOString().split('T')[0],
        testAppointmentId,
        setup.barber1BarberId,
        new Date(),
        new Date(),
      ]
    );

    // Create expense transaction
    expenseTransactionId = randomUUID();
    await pool.query(
      `INSERT INTO transactions (id, type, category, amount, description, date, appointment_id, barber_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        expenseTransactionId,
        'EXPENSE',
        'Produtos',
        '100.00',
        'Teste expense',
        new Date().toISOString().split('T')[0],
        null,
        setup.barber1BarberId,
        new Date(),
        new Date(),
      ]
    );
  });

  describe('GET /api/v1/transactions', () => {
    it('ADMIN: lists all transactions', async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0].passwordHash).toBeUndefined();
      expect(res.body.data.every((t: { amount: string }) => typeof t.amount === 'string')).toBe(
        true
      );
    });

    it('CUSTOMER: access denied -> 403', async () => {
      await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(403);
    });

    it('BARBER: access denied -> 403', async () => {
      await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(403);
    });

    it('ADMIN: filter by type INCOME', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?type=INCOME')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((t: { type: string }) => t.type === 'INCOME')).toBe(true);
    });

    it('ADMIN: filter by type EXPENSE', async () => {
      const res = await request(app)
        .get('/api/v1/transactions?type=EXPENSE')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((t: { type: string }) => t.type === 'EXPENSE')).toBe(true);
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    it('ADMIN: accesses income transaction', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${incomeTransactionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(incomeTransactionId);
      expect(res.body.type).toBe('INCOME');
      expect(res.body.passwordHash).toBeUndefined();
      expect(typeof res.body.amount).toBe('string');
    });

    it('ADMIN: accesses expense transaction', async () => {
      const res = await request(app)
        .get(`/api/v1/transactions/${expenseTransactionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.type).toBe('EXPENSE');
    });

    it('CUSTOMER: access denied -> 403', async () => {
      await request(app)
        .get(`/api/v1/transactions/${incomeTransactionId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(403);
    });

    it('BARBER: access denied -> 403', async () => {
      await request(app)
        .get(`/api/v1/transactions/${incomeTransactionId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(403);
    });

    it('Non-existent transaction -> 404', async () => {
      await request(app)
        .get(`/api/v1/transactions/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/transactions', () => {
    it('ADMIN: creates INCOME transaction', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'INCOME',
          category: 'Corte',
          amount: '45.00',
          description: 'Teste de criação income',
          date: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.type).toBe('INCOME');
      expect(res.body.amount).toBe('45.00');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('ADMIN: creates EXPENSE transaction', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'EXPENSE',
          category: 'Produtos',
          amount: '100.00',
          description: 'Compra de produtos teste',
          date: new Date().toISOString(),
        })
        .expect(201);

      expect(res.body.type).toBe('EXPENSE');
      expect(res.body.amount).toBe('100.00');
    });

    it('ADMIN: creates INCOME with appointmentId', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'INCOME',
          category: 'Corte',
          amount: '45.00',
          date: new Date().toISOString(),
          appointmentId: testAppointmentId,
        })
        .expect(201);

      expect(res.body.type).toBe('INCOME');
    });

    it('ADMIN: creates EXPENSE with appointmentId -> 400 (domain rule)', async () => {
      await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'EXPENSE',
          category: 'Teste',
          amount: '50.00',
          date: new Date().toISOString(),
          appointmentId: testAppointmentId,
        })
        .expect(400);
    });

    it('CUSTOMER: tries to create -> 403', async () => {
      await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          type: 'INCOME',
          category: 'Teste',
          amount: '10.00',
          date: new Date().toISOString(),
        })
        .expect(403);
    });

    it('BARBER: tries to create -> 403', async () => {
      await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({
          type: 'INCOME',
          category: 'Teste',
          amount: '10.00',
          date: new Date().toISOString(),
        })
        .expect(403);
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ type: 'INVALID', amount: '-10', date: 'invalid' })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/transactions/:id', () => {
    it('ADMIN: updates income transaction', async () => {
      const res = await request(app)
        .patch(`/api/v1/transactions/${incomeTransactionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: '55.00', description: 'Atualizado pelo admin' })
        .expect(200);

      expect(res.body.amount).toBe('55.00');
      expect(res.body.description).toBe('Atualizado pelo admin');
    });

    it('CUSTOMER: tries to update -> 403', async () => {
      await request(app)
        .patch(`/api/v1/transactions/${incomeTransactionId}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ amount: '999.00' })
        .expect(403);
    });

    it('BARBER: tries to update -> 403', async () => {
      await request(app)
        .patch(`/api/v1/transactions/${incomeTransactionId}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({ amount: '999.00' })
        .expect(403);
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .patch(`/api/v1/transactions/${incomeTransactionId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: '-50.00', type: 'INVALID' })
        .expect(400);
    });

    it('Non-existent transaction -> 404', async () => {
      await request(app)
        .patch(`/api/v1/transactions/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: '50.00' })
        .expect(404);
    });
  });
});
