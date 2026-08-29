/* eslint-disable @typescript-eslint/consistent-type-imports */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { setupTestEnvironment } from './test-utils';

describe('Barbers API - /api/v1/barbers', () => {
  let app: ReturnType<typeof import('../../../http/app').createApp>;
  let customerUserToken: string;
  let barber1UserToken: string;
  // const barber2UserToken = setup.barber2Token;
  let adminUserToken: string;
  let barber1Id: string;
  let barber2Id: string;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    app = setup.app;
    customerUserToken = setup.customer1Token;
    barber1UserToken = setup.barber1Token;
    // barber2UserToken = setup.barber2Token;
    adminUserToken = setup.adminToken;
    barber1Id = setup.barber1BarberId;
    barber2Id = setup.barber2BarberId;
  });

  describe('GET /api/v1/barbers', () => {
    it('CUSTOMER: lists active barbers', async () => {
      const res = await request(app)
        .get('/api/v1/barbers')
        .set('Authorization', `Bearer ${customerUserToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every((b: { active: boolean }) => b.active === true)).toBe(true);
      expect(res.body.data[0].passwordHash).toBeUndefined();
    });

    it('BARBER: lists only own profile', async () => {
      const res = await request(app)
        .get('/api/v1/barbers')
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(barber1Id);
    });

    it('ADMIN: lists all barbers', async () => {
      const res = await request(app)
        .get('/api/v1/barbers')
        .set('Authorization', `Bearer ${adminUserToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/barbers/:id', () => {
    it('CUSTOMER: accesses active barber', async () => {
      const res = await request(app)
        .get(`/api/v1/barbers/${barber1Id}`)
        .set('Authorization', `Bearer ${customerUserToken}`)
        .expect(200);

      expect(res.body.id).toBe(barber1Id);
      expect(res.body.active).toBe(true);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('BARBER: accesses own profile', async () => {
      const res = await request(app)
        .get(`/api/v1/barbers/${barber1Id}`)
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .expect(200);

      expect(res.body.id).toBe(barber1Id);
    });

    it('BARBER: tries to access another barber -> 403', async () => {
      await request(app)
        .get(`/api/v1/barbers/${barber2Id}`)
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .expect(403);
    });

    it('ADMIN: accesses any barber', async () => {
      const res = await request(app)
        .get(`/api/v1/barbers/${barber2Id}`)
        .set('Authorization', `Bearer ${adminUserToken}`)
        .expect(200);

      expect(res.body.id).toBe(barber2Id);
    });

    it('Non-existent barber -> 404', async () => {
      const { randomUUID } = await import('node:crypto');
      const fakeId = randomUUID();
      await request(app)
        .get(`/api/v1/barbers/${fakeId}`)
        .set('Authorization', `Bearer ${adminUserToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/barbers', () => {
    it('ADMIN: creates barber -> 201', async () => {
      const res = await request(app)
        .post('/api/v1/barbers')
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({
          name: 'Novo Barbeiro',
          phone: '(11) 99999-9999',
          specialty: 'Corte degradê',
          hireDate: '2024-01-15T00:00:00.000Z',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Novo Barbeiro');
      expect(res.body.active).toBe(true);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('BARBER: tries to create -> 403', async () => {
      await request(app)
        .post('/api/v1/barbers')
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .send({ name: 'Tentativa', specialty: 'Teste' })
        .expect(403);
    });

    it('CUSTOMER: tries to create -> 403', async () => {
      await request(app)
        .post('/api/v1/barbers')
        .set('Authorization', `Bearer ${customerUserToken}`)
        .send({ name: 'Tentativa' })
        .expect(403);
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .post('/api/v1/barbers')
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({ name: '', hireDate: 'invalid-date' })
        .expect(400);
    });
  });

  describe('PATCH /api/v1/barbers/:id', () => {
    it('BARBER: updates own profile', async () => {
      const res = await request(app)
        .patch(`/api/v1/barbers/${barber1Id}`)
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .send({ specialty: 'Corte degradê e barba' })
        .expect(200);

      expect(res.body.specialty).toBe('Corte degradê e barba');
    });

    it('BARBER: tries to update another barber -> 403', async () => {
      await request(app)
        .patch(`/api/v1/barbers/${barber2Id}`)
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .send({ specialty: 'Teste' })
        .expect(403);
    });

    it('CUSTOMER: tries to update -> 403', async () => {
      await request(app)
        .patch(`/api/v1/barbers/${barber1Id}`)
        .set('Authorization', `Bearer ${customerUserToken}`)
        .send({ name: 'Tentativa' })
        .expect(403);
    });

    it('ADMIN: updates any barber', async () => {
      const res = await request(app)
        .patch(`/api/v1/barbers/${barber2Id}`)
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({ active: false })
        .expect(200);

      expect(res.body.active).toBe(false);
    });

    it('Invalid input -> 400', async () => {
      await request(app)
        .patch(`/api/v1/barbers/${barber1Id}`)
        .set('Authorization', `Bearer ${barber1UserToken}`)
        .send({ name: '', active: 'invalid' })
        .expect(400);
    });

    it('Non-existent barber -> 404', async () => {
      const { randomUUID } = await import('node:crypto');
      const fakeId = randomUUID();
      await request(app)
        .patch(`/api/v1/barbers/${fakeId}`)
        .set('Authorization', `Bearer ${adminUserToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });
  });
});
