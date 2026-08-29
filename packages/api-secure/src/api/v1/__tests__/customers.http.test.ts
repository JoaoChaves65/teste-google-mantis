/* eslint-disable @typescript-eslint/consistent-type-imports */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { setupTestEnvironment } from './test-utils';

describe('Customers API - /api/v1/customers', () => {
  let app: ReturnType<typeof import('../../../http/app').createApp>;
  let customer1Token: string;
  let barber1Token: string;
  let adminToken: string;
  let customer1Id: string;
  let customer2Id: string;
  // const customer3Id = setup.customer3Id;
  // const barber1Id = setup.barber1Id;
  // const barber2Id = setup.barber2Id;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    app = setup.app;
    customer1Token = setup.customer1Token;
    barber1Token = setup.barber1Token;
    adminToken = setup.adminToken;
    customer1Id = setup.customer1CustId;
    customer2Id = setup.customer2CustId;
  });

  describe('GET /api/v1/customers', () => {
    it('CUSTOMER: returns only own customer', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].email).toBe('carlos.cliente@barberlab.local');
      expect(res.body.data[0].passwordHash).toBeUndefined();
    });

    it('ADMIN: returns all customers', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.every((c: { email: string }) => c.email)).toBe(true);
      expect(
        res.body.data.every((c: { passwordHash: unknown }) => c.passwordHash === undefined)
      ).toBe(true);
    });

    it('BARBER: returns customers related to their appointments', async () => {
      const res = await request(app)
        .get('/api/v1/customers')
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(200);

      // BARBER 1 has appointments with customer1 (carlos)
      const emails = res.body.data.map((c: { email: string }) => c.email).sort();
      expect(emails).toContain('carlos.cliente@barberlab.local');
    });
  });

  describe('GET /api/v1/customers/:id', () => {
    it('CUSTOMER: accesses own customer', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customer1Id}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(200);

      expect(res.body.email).toBe('carlos.cliente@barberlab.local');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('CUSTOMER: accesses another customer -> 403', async () => {
      await request(app)
        .get(`/api/v1/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(403);
    });

    it('ADMIN: accesses any customer', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.email).toBe('ana.cliente@barberlab.local');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('BARBER: accesses related customer (has appointment)', async () => {
      const res = await request(app)
        .get(`/api/v1/customers/${customer1Id}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(200);

      expect(res.body.email).toBe('carlos.cliente@barberlab.local');
    });

    it('BARBER: accesses unrelated customer -> 403', async () => {
      // customer2 (ana) and customer3 (pedro) have no appointments with barber1
      await request(app)
        .get(`/api/v1/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(403);
    });

    it('Non-existent customer -> 404', async () => {
      const { randomUUID } = await import('node:crypto');
      const fakeId = randomUUID();
      await request(app)
        .get(`/api/v1/customers/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/customers', () => {
    it('ADMIN: creates customer -> 201', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Novo Cliente',
          phone: '(11) 99999-9999',
          email: 'novo@test.com',
          birthDate: '1995-01-01T00:00:00.000Z',
          notes: 'Teste de criação',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Novo Cliente');
      expect(res.body.email).toBe('novo@test.com');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('BARBER: creates customer -> 201', async () => {
      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${barber1Token}`)
        .send({
          name: 'Cliente do Barbeiro',
          phone: '(11) 88888-8888',
          email: 'barbercliente@test.com',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
    });

    it('CUSTOMER: tries to create -> 403', async () => {
      await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({
          name: 'Tentativa',
          phone: '(11) 77777-7777',
        })
        .expect(403);
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
          phone: 'invalid',
        })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/customers/:id', () => {
    it('CUSTOMER: updates own customer', async () => {
      const res = await request(app)
        .patch(`/api/v1/customers/${customer1Id}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ phone: '(11) 90000-0000' })
        .expect(200);

      expect(res.body.phone).toBe('(11) 90000-0000');
    });

    it('CUSTOMER: tries to update another customer -> 403', async () => {
      await request(app)
        .patch(`/api/v1/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ phone: '(11) 80000-0000' })
        .expect(403);
    });

    it('ADMIN: updates any customer', async () => {
      const res = await request(app)
        .patch(`/api/v1/customers/${customer2Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'Atualizado pelo admin' })
        .expect(200);

      expect(res.body.notes).toBe('Atualizado pelo admin');
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .patch(`/api/v1/customers/${customer1Id}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('Non-existent customer -> 404', async () => {
      const { randomUUID } = await import('node:crypto');
      const fakeId = randomUUID();
      await request(app)
        .patch(`/api/v1/customers/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });
  });
});
