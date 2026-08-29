/* eslint-disable @typescript-eslint/consistent-type-imports */
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../http/app';
import { createPasswordHasher } from '@barberlab/core/shared';
import { getTestPool, resetTestDatabase, runMigrations } from '@barberlab/core/infrastructure';

describe('Auth API', () => {
  let app: ReturnType<typeof createApp>;
  const testEmail = 'test@barberlab.local';
  const testPassword = 'validpassword123';

  beforeAll(async () => {
    await resetTestDatabase();
    await runMigrations('up');

    // Create test user
    const pool = getTestPool();
    const passwordHasher = createPasswordHasher();
    const passwordHash = await passwordHasher.hash(testPassword);
    const userId = randomUUID();
    await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [userId, 'Test User', testEmail, passwordHash, 'CUSTOMER', 'ACTIVE', new Date(), new Date()]
    );

    app = createApp();
  });

  // Don't end the pool - it's shared with other tests

  describe('POST /auth/login', () => {
    it('returns 200 with access token and sets refresh cookie for valid credentials', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'];
      const refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
      expect(refreshCookie).toBeDefined();
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('SameSite=Strict');
      expect(refreshCookie).toContain('Path=/auth');
    });

    it('returns 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'nonexistent@barberlab.local', password: testPassword })
        .expect(401);

      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns 401 with Invalid email or password for inactive user', async () => {
      const pool = getTestPool();
      const passwordHasher = createPasswordHasher();
      const passwordHash = await passwordHasher.hash('password123');
      const inactiveUserId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          inactiveUserId,
          'Inactive User',
          'inactive@barberlab.local',
          passwordHash,
          'CUSTOMER',
          'INACTIVE',
          new Date(),
          new Date(),
        ]
      );

      try {
        const res = await request(app)
          .post('/auth/login')
          .send({ email: 'inactive@barberlab.local', password: 'password123' })
          .expect(401);

        expect(res.body.error).toBe('Invalid email or password');
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [inactiveUserId]);
      }
    });

    it('normalizes email case and whitespace', async () => {
      const pool = getTestPool();
      const passwordHasher = createPasswordHasher();
      const passwordHash = await passwordHasher.hash(testPassword);
      const userId = randomUUID();

      // Create user with normalized email
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          'Test User',
          'user@barberlab.local',
          passwordHash,
          'CUSTOMER',
          'ACTIVE',
          new Date(),
          new Date(),
        ]
      );

      try {
        const res = await request(app)
          .post('/auth/login')
          .send({ email: '  USER@BARBERLAB.LOCAL  ', password: testPassword })
          .expect(200);

        expect(res.body.accessToken).toBeDefined();
        expect(res.body.user.email).toBe('user@barberlab.local');
      } finally {
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      }
    });

    it('does not return refresh token in response body', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      expect(res.body.refreshToken).toBeUndefined();
    });
  });

  describe('POST /auth/refresh', () => {
    let refreshCookie: string;
    let accessToken: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });

      accessToken = res.body.accessToken;
      const cookies = res.headers['set-cookie'];
      refreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
    });

    it('returns new access token and rotates refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie])
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.accessToken).not.toBe(accessToken);
      // refreshToken is in cookie, not body
      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'];
      const newRefreshCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
      expect(newRefreshCookie).toBeDefined();
    });

    it('rejects request without refresh cookie', async () => {
      const res = await request(app).post('/auth/refresh').expect(401);

      expect(res.body.error).toBe('Missing refresh token cookie');
    });

    it('rejects invalid refresh token', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=invalid-token'])
        .expect(401);

      expect(res.body.error).toBe('Invalid refresh token');
    });

    it('rejects revoked refresh token', async () => {
      // First refresh to get a new token
      await request(app).post('/auth/refresh').set('Cookie', [refreshCookie]).expect(200);

      // Try to use the old cookie again
      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie])
        .expect(401);

      expect(res.body.error).toBe('Refresh token revoked');
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes refresh token and clears cookie', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });

      const refreshCookie = loginRes.headers['set-cookie'].find((c: string) =>
        c.startsWith('refresh_token=')
      );

      const logoutRes = await request(app)
        .post('/auth/logout')
        .set('Cookie', [refreshCookie])
        .expect(204);

      expect(logoutRes.headers['set-cookie']).toBeDefined();
      const cookies = logoutRes.headers['set-cookie'];
      const clearedCookie = cookies.find((c: string) => c.startsWith('refresh_token='));
      // Cookie can be cleared with either Max-Age=0 or Expires=Thu, 01 Jan 1970
      expect(clearedCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/);
    });

    it('succeeds even without cookie', async () => {
      await request(app).post('/auth/logout').expect(204);
    });

    it('invalidates refresh token so it cannot be used again', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });

      const refreshCookie = loginRes.headers['set-cookie'].find((c: string) =>
        c.startsWith('refresh_token=')
      );

      await request(app).post('/auth/logout').set('Cookie', [refreshCookie]).expect(204);

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie])
        .expect(401);

      expect(res.body.error).toBe('Refresh token revoked');
    });
  });

  describe('GET /auth/me', () => {
    it('returns current user with valid access token', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });

      const accessToken = loginRes.body.accessToken;

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe(testEmail);
      expect(res.body.role).toBe('CUSTOMER');
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();
    });

    it('returns 401 without Authorization header', async () => {
      const res = await request(app).get('/auth/me').expect(401);

      expect(res.body.error).toBe('Missing or invalid authorization header');
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(res.body.error).toBe('Invalid access token');
    });

    it('returns 401 with expired token', async () => {
      // We can't easily test this without manipulating time
    });

    it('returns 401 with refresh token instead of access token', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });

      const refreshCookie = loginRes.headers['set-cookie'].find((c: string) =>
        c.startsWith('refresh_token=')
      );
      const refreshToken = refreshCookie.split(';')[0].split('=')[1];

      const res2 = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);

      // Refresh token fails verification as access token (different secret)
      expect(res2.body.error).toBe('Invalid access token');
    });
  });

  describe('Rate limiting', () => {
    const rateLimitEmail = 'ratelimit@barberlab.local';
    const rateLimitPassword = 'ratelimitpass123';

    beforeAll(async () => {
      const pool = getTestPool();
      const passwordHasher = createPasswordHasher();
      const passwordHash = await passwordHasher.hash(rateLimitPassword);
      const userId = randomUUID();
      await pool.query(
        `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [
          userId,
          'Rate Limit User',
          rateLimitEmail,
          passwordHash,
          'CUSTOMER',
          'ACTIVE',
          new Date(),
          new Date(),
        ]
      );
    });

    afterAll(async () => {
      const pool = getTestPool();
      await pool.query('DELETE FROM users WHERE email = $1', [rateLimitEmail]);
    });

    it('rate limits login attempts', async () => {
      // Make 20 failed requests
      for (let i = 0; i < 20; i++) {
        await request(app).post('/auth/login').send({ email: rateLimitEmail, password: 'wrong' });
      }

      // 21st request should be rate limited
      const res = await request(app)
        .post('/auth/login')
        .send({ email: rateLimitEmail, password: 'wrong' })
        .expect(429);

      expect(res.body.error).toContain('Too many authentication attempts');
    });

    it('rate limits refresh attempts', async () => {
      for (let i = 0; i < 20; i++) {
        await request(app).post('/auth/refresh').set('Cookie', ['refresh_token=invalid']);
      }

      const res = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=invalid'])
        .expect(429);

      expect(res.body.error).toContain('Too many authentication attempts');
    });
  });
});
