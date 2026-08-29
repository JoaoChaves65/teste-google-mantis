/* eslint-disable @typescript-eslint/consistent-type-imports */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { setupTestEnvironment } from './test-utils';

describe('Services API - /api/v1/services', () => {
  let app: ReturnType<typeof import('../../../http/app').createApp>;
  let customerUserToken: string;
  let barber1UserToken: string;
  let adminUserToken: string;
  let service1Id: string;
  // const service2Id = setup.service2Id;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    app = setup.app;
    customerUserToken = setup.customer1Token;
    barber1UserToken = setup.barber1Token;
    adminUserToken = setup.adminToken;
    service1Id = setup.service1Id;
  });

  describe('GET /api/v1/services', () => {
    it('CUSTOMER: lists active services', async () => {
      const res = await request(app)
        .get('/api/v1/services')
        .set('Authorization', `Bearer ${customerUserToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.every((s: { active: boolean }) => s.active === true)).toBe(true);
      expect(res.body.data[0].passwordHash).toBeUndefined();
    });

    it('BARBER: lists active services', async () => {
      const res = await request(app)
        .get('/api/v1/services')
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.every((s: { active: boolean }) => s.active === true)).toBe(true);
    });

    it('ADMIN: lists all services (including inactive)', async () => {
      const res = await request(app)
        .get('/api/v1/services')
        .set('Authorization', `Bearer ${adminUserToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('GET /api/v1/services/:id', () => {
    it('CUSTOMER: accesses active service', async () => {
      const res = await request(app)
        .get(`/api/v1/services/${service1Id}`)
        .set('Authorization', `Bearer ${customerUserToken}`)
        .expect(200);

      expect(res.body.id).toBe(service1Id);
      expect(res.body.active).toBe(true);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('BARBER: accesses active service', async () => {
      const res = await request(app)
        .get(`/api/v1/services/${service1Id}`)
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .expect(200);

      expect(res.body.id).toBe(service1Id);
    });

    it('CUSTOMER: accesses inactive service -> 404', async () => {
      // Create inactive service
      const { getTestPool } = await import('@barberlab/core/infrastructure');
      const { randomUUID } = await import('node:crypto');
      const pool = getTestPool();
      const inactiveId = randomUUID();
      await pool.query(
        `INSERT INTO services (id, name, description, price, duration_minutes, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [inactiveId, 'Inactive Service', 'Inactive', 50.0, 30, false, new Date(), new Date()]
      );

      await request(app)
        .get(`/api/v1/services/${inactiveId}`)
        .set('Authorization', `Bearer ${customerUserToken}`)
        .expect(404);
    });

    it('Non-existent service -> 404', async () => {
      const { randomUUID } = await import('node:crypto');
      await request(app)
        .get(`/api/v1/services/${randomUUID()}`)
        .set('Authorization', `Bearer ${customerUserToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/services', () => {
    it('ADMIN: creates service -> 201', async () => {
      const res = await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({
          name: 'Novo Serviço Teste',
          description: 'Descrição do novo serviço',
          price: '60.00',
          durationMinutes: 30,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Novo Serviço Teste');
      expect(res.body.price).toBe('60.00');
    });

    it('BARBER: tries to create -> 403', async () => {
      await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .send({
          name: 'Serviço Barber',
          price: '50.00',
          durationMinutes: 30,
        })
        .expect(403);
    });

    it('CUSTOMER: tries to create -> 403', async () => {
      await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${customerUserToken}`)
        .send({
          name: 'Serviço Cliente',
          price: '50.00',
          durationMinutes: 30,
        })
        .expect(403);
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .post('/api/v1/services')
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({
          name: '',
          price: -10,
          durationMinutes: 0,
        })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/services/:id', () => {
    it('ADMIN: updates service', async () => {
      const res = await request(app)
        .patch(`/api/v1/services/${service1Id}`)
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({ price: '55.00', active: false })
        .expect(200);

      expect(res.body.price).toBe('55.00');
      expect(res.body.active).toBe(false);
    });

    it('BARBER: tries to update -> 403', async () => {
      await request(app)
        .patch(`/api/v1/services/${service1Id}`)
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .send({ price: '55.00' })
        .expect(403);
    });

    it('CUSTOMER: tries to update -> 403', async () => {
      await request(app)
        .patch(`/api/v1/services/${service1Id}`)
        .set('Authorization', `Bearer ${customerUserToken}`)
        .send({ price: '55.00' })
        .expect(403);
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .patch(`/api/v1/services/${service1Id}`)
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({ price: -10 })
        .expect(400);
    });

    it('Non-existent service -> 404', async () => {
      const { randomUUID } = await import('node:crypto');
      await request(app)
        .patch(`/api/v1/services/${randomUUID()}`)
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({ price: '50.00' })
        .expect(404);
    });
  });
});
