/* eslint-disable @typescript-eslint/consistent-type-imports */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { setupTestEnvironment } from './test-utils';

describe('Security Tests - /api/v1', () => {
  let app: ReturnType<typeof import('../../../http/app').createApp>;
  let customer1Token: string;
  let barber1Token: string;
  let adminToken: string;
  let customer2Id: string;
  let barber2Id: string;
  let customer2TransactionId: string;
  let barber2AppointmentId: string;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    app = setup.app;
    customer1Token = setup.customer1Token;
    barber1Token = setup.barber1Token;
    adminToken = setup.adminToken;

    const { getTestPool } = await import('@barberlab/core/infrastructure');
    const pool = getTestPool();

    // Get customer IDs for IDOR tests
    const cRes = await pool.query(`SELECT id FROM customers WHERE user_id IN (
      SELECT id FROM users WHERE email IN ('carlos.cliente@barberlab.local', 'ana.cliente@barberlab.local')
    )`);
    customer2Id = cRes.rows[1]?.id;

    // Get barber2 ID
    const bRes = await pool.query(`SELECT id FROM barbers WHERE user_id = (
      SELECT id FROM users WHERE email = 'maria.barbeira@barberlab.local'
    )`);
    barber2Id = bRes.rows[0]?.id;

    // Get a real transaction belonging to customer2
    const tRes = await pool.query(
      `SELECT id FROM transactions WHERE appointment_id IN (
      SELECT id FROM appointments WHERE customer_id = $1
    ) LIMIT 1`,
      [customer2Id]
    );
    customer2TransactionId = tRes.rows[0]?.id;

    // Get a real appointment belonging to barber2
    const aRes = await pool.query(`SELECT id FROM appointments WHERE barber_id = $1 LIMIT 1`, [
      barber2Id,
    ]);
    barber2AppointmentId = aRes.rows[0]?.id;
  });

  describe('Identity Manipulation', () => {
    it('CUSTOMER cannot override userId via request body', async () => {
      await request(app)
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          customerId: customer2Id, // Try to create for another customer
          barberId: '00000000-0000-0000-0000-000000000000',
          serviceId: '00000000-0000-0000-0000-000000000000',
          dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(403);

      // Should use req.user.sub, not the body customerId
    });

    it('CUSTOMER role cannot be elevated via customer creation', async () => {
      await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          name: 'Test',
          phone: '123',
          // Trying to inject role in body
          role: 'ADMIN',
        })
        .expect(403);
    });
  });

  describe('IDOR Protection', () => {
    it('CUSTOMER cannot access another customer data', async () => {
      await request(app)
        .get(`/api/v1/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(403);
    });

    it('CUSTOMER cannot access another customer appointment', async () => {
      // Need to get a real appointment ID for customer2
      const { getTestPool } = await import('@barberlab/core/infrastructure');
      const pool = getTestPool();
      const apptRes = await pool.query(
        `SELECT id FROM appointments WHERE customer_id = $1 LIMIT 1`,
        [customer2Id]
      );
      const otherApptId = apptRes.rows[0]?.id;

      if (otherApptId) {
        await request(app)
          .get(`/api/v1/appointments/${otherApptId}`)
          .set('Authorization', `Bearer ${customer1Token}`)
          .expect(403);
      }
    });

    it('BARBER cannot access another barber data', async () => {
      const b1Login = await request(app)
        .post('/auth/login')
        .send({ email: 'joao.barbeiro@barberlab.local', password: 'validpassword123' });
      const barber1Token = b1Login.body.accessToken;

      if (barber2Id) {
        await request(app)
          .get(`/api/v1/barbers/${barber2Id}`)
          .set('Authorization', `Bearer ${barber1Token}`)
          .expect(403);
      }
    });

    it('CUSTOMER cannot access another customer transaction (real ID)', async () => {
      if (customer2TransactionId) {
        await request(app)
          .get(`/api/v1/transactions/${customer2TransactionId}`)
          .set('Authorization', `Bearer ${customer1Token}`)
          .expect(403);
      }
    });

    it('BARBER cannot access another barber appointment (real ID)', async () => {
      if (barber2AppointmentId) {
        await request(app)
          .get(`/api/v1/appointments/${barber2AppointmentId}`)
          .set('Authorization', `Bearer ${barber1Token}`)
          .expect(403);
      }
    });

    it('BARBER cannot access customer from unrelated barber context', async () => {
      // Check if barber2 has a customer that barber1 doesn't
      if (customer2Id && barber2AppointmentId) {
        // customer2 is ana.cliente@barberlab.local who has appointment with barber2 (maria)
        // barber1 is joao who has appointments with customer1 (carlos) and possibly others
        // Try to access customer2 via barber1 token
        await request(app)
          .get(`/api/v1/customers/${customer2Id}`)
          .set('Authorization', `Bearer ${barber1Token}`)
          .expect(403);
      }
    });
  });

  describe('Password Hash Never Exposed', () => {
    it('GET /api/v1/users never returns passwordHash', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const user of res.body.data) {
        expect(user.passwordHash).toBeUndefined();
        expect(user.password_hash).toBeUndefined();
      }
    });

    it('GET /api/v1/users/:id never returns passwordHash', async () => {
      const listRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const userId = listRes.body.data[0]?.id;

      const res = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.password_hash).toBeUndefined();
    });

    it('GET /api/v1/customers never returns passwordHash', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const customer of res.body.data) {
        expect(customer.passwordHash).toBeUndefined();
        expect(customer.password_hash).toBeUndefined();
      }
    });

    it('Auth /me never returns passwordHash or refreshToken', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();
    });
  });

  describe('Refresh Token Never in Response Body', () => {
    it('POST /auth/login returns accessToken but not refreshToken in body', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'carlos.cliente@barberlab.local', password: 'validpassword123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeUndefined();
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('refresh_token=');
    });

    it('POST /auth/refresh returns accessToken but not refreshToken in body', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: 'carlos.cliente@barberlab.local', password: 'validpassword123' })
        .expect(200);

      const refreshCookie = loginRes.headers['set-cookie'].find((c: string) =>
        c.startsWith('refresh_token=')
      );

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie])
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeUndefined();
    });
  });

  describe('Secrets Never Exposed', () => {
    it('No JWT secret in responses', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain('JWT_ACCESS_SECRET');
      expect(responseStr).not.toContain('JWT_REFRESH_SECRET');
    });

    it('No database credentials in responses', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const responseStr = JSON.stringify(res.body);
      expect(responseStr).not.toContain('DB_PASSWORD');
      expect(responseStr).not.toContain('DB_USER');
    });
  });

  describe('Error Handling - No Stack Traces or SQL', () => {
    it('404 errors do not contain stack trace', async () => {
      const res = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.message || res.body.error).not.toContain('stack');
      expect(res.body.error.message || res.body.error).not.toContain('at ');
    });

    it('400 validation errors do not contain SQL', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '', phone: 'invalid' })
        .expect(400);

      expect(res.body.error).toBeDefined();
      expect(JSON.stringify(res.body)).not.toContain('SELECT');
      expect(JSON.stringify(res.body)).not.toContain('INSERT');
      expect(JSON.stringify(res.body)).not.toContain('UPDATE');
      expect(JSON.stringify(res.body)).not.toContain('DELETE');
    });

    it('Error responses do not expose internal details', async () => {
      // Test that error responses don't contain sensitive info
      const res = await request(app)
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.error).toBeDefined();
      expect(typeof res.body.error).toBe('object');

      // Ensure no sensitive data in error response
      const errorStr = JSON.stringify(res.body);
      expect(errorStr).not.toContain('password');
      expect(errorStr).not.toContain('secret');
      expect(errorStr).not.toContain('JWT');
      expect(errorStr).not.toContain('DB_');
      expect(errorStr).not.toContain('connection');
      expect(errorStr).not.toContain('stack');
      expect(errorStr).not.toContain('SELECT');
      expect(errorStr).not.toContain('INSERT');
    });
  });

  describe('Role-based Authorization Enforcement', () => {
    it('CUSTOMER cannot access admin endpoints', async () => {
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(403);
    });

    it('CUSTOMER cannot access transactions', async () => {
      await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(403);
    });

    it('BARBER cannot access transactions', async () => {
      const b1Login = await request(app)
        .post('/auth/login')
        .send({ email: 'joao.barbeiro@barberlab.local', password: 'validpassword123' });
      const barber1Token = b1Login.body.accessToken;

      await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(403);
    });

    it('CUSTOMER cannot create barbers', async () => {
      await request(app)
        .post('/api/v1/barbers')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ name: 'Test', specialty: 'Test' })
        .expect(403);
    });

    it('BARBER cannot create services', async () => {
      const b1Login = await request(app)
        .post('/auth/login')
        .send({ email: 'joao.barbeiro@barberlab.local', password: 'validpassword123' });
      const barber1Token = b1Login.body.accessToken;

      await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({ name: 'Test', price: '10.00', durationMinutes: 10 })
        .expect(403);
    });
  });
});
