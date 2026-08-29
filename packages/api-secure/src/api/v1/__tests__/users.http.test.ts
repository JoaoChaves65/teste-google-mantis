/* eslint-disable @typescript-eslint/consistent-type-imports */
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { setupTestEnvironment } from './test-utils';

describe('Users API - /api/v1/users', () => {
  let app: ReturnType<typeof import('../../../http/app').createApp>;
  let customer1Token: string;
  let barber1Token: string;
  let adminToken: string;
  let adminId: string;
  let barber1Id: string;
  let customer1Id: string;
  // const customer2Id = setup.customer2Id;
  // const customer3Id = setup.customer3Id;

  beforeAll(async () => {
    const setup = await setupTestEnvironment();
    app = setup.app;
    customer1Token = setup.customer1Token;
    barber1Token = setup.barber1Token;
    adminToken = setup.adminToken;
    adminId = setup.adminId;
    barber1Id = setup.barber1Id;
    customer1Id = setup.customer1Id;
  });

  describe('GET /api/v1/users', () => {
    it('ADMIN: lists all users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(6);
      expect(res.body.data[0].passwordHash).toBeUndefined();
      expect(
        res.body.data.every((u: { role: string }) =>
          ['ADMIN', 'BARBER', 'CUSTOMER'].includes(u.role)
        )
      ).toBe(true);
    });

    it('CUSTOMER: access denied -> 403', async () => {
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(403);
    });

    it('BARBER: access denied -> 403', async () => {
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(403);
    });

    it('ADMIN: pagination works', async () => {
      const res = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('ADMIN: accesses user', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${adminId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(adminId);
      expect(res.body.email).toBe('admin@barberlab.local');
      expect(res.body.role).toBe('ADMIN');
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('CUSTOMER: access denied -> 403', async () => {
      await request(app)
        .get(`/api/v1/users/${customer1Id}`)
        .set('Authorization', `Bearer ${customer1Token}`)
        .expect(403);
    });

    it('BARBER: access denied -> 403', async () => {
      await request(app)
        .get(`/api/v1/users/${barber1Id}`)
        .set('Authorization', `Bearer ${barber1Token}`)
        .expect(403);
    });

    it('ADMIN: passwordHash never appears in response', async () => {
      const listRes = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const user of listRes.body.data) {
        expect(user.passwordHash).toBeUndefined();
      }
    });

    it('Non-existent user -> 404', async () => {
      const { randomUUID } = await import('node:crypto');
      const fakeId = randomUUID();
      await request(app)
        .get(`/api/v1/users/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
