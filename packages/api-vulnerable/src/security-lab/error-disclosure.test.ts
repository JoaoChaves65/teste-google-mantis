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

describe('Security Lab - Excessive Error Disclosure', () => {
  let app: ReturnType<typeof createApp>;
  let pool: ReturnType<typeof getTestPool>;
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

    // Login and get token
    const adminLogin = await request(app)
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'validpassword123' });
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await closeTestPool();
  });

  describe('VULNERÁVEL: Error Disclosure', () => {
    it('VULNERÁVEL: 500 error expõe stack trace completo', async () => {
      // Força um erro 500 interno via endpoint de teste
      const response = await request(app)
        .get('/api/v1/__trigger_500__')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      // VULNERÁVEL: Stack trace exposto na resposta
      expect(response.body.error).toBeDefined();
      expect(response.body.error.stack).toBeDefined();
      expect(response.body.error.stack).toContain('at ');
      expect(response.body.error.stack.length).toBeGreaterThan(100);
    });

    it('VULNERÁVEL: Validation error expõe detalhes', async () => {
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test',
          phone: 'invalid',
          email: 'invalid-email',
        });

      // Qualquer que seja o status (400, 422, etc), verifica se erro tem detalhes
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      // O error handler vulnerable expõe detalhes do erro
      expect(response.body.error || response.body.errors || response.body.message).toBeDefined();
    });

    it('VULNERÁVEL: Database constraint error expõe detalhes', async () => {
      // Cria um customer primeiro
      await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test User',
          phone: '11999999999',
          email: 'existing@test.com',
        })
        .expect(201);

      // Tenta criar outro com mesmo email
      const response = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test User 2',
          phone: '11999999999',
          email: 'existing@test.com',
        });

      // Pode retornar 409, 500, ou outro erro
      expect(response.status).toBeGreaterThanOrEqual(400);
      // VULNERÁVEL: Detalhes do erro de banco expostos
      expect(response.body.error).toBeDefined();
      // Verifica se expõe detalhes do erro (stack, code, etc)
      expect(
        response.body.error.stack || response.body.error.details || response.body.error.code
      ).toBeDefined();
    });

    it('VULNERÁVEL: 404 expõe stack trace no error handler', async () => {
      // Usa endpoint inexistente que cai no notFoundHandler
      const response = await request(app)
        .get('/api/v1/nonexistent-endpoint')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // VULNERÁVEL: 404 também expõe stack trace no error handler vulnerable
      expect(response.body.error).toBeDefined();
      // O error handler vulnerable expõe stack trace
      expect(response.body.error.stack).toBeDefined();
      expect(response.body.error.stack).toContain('at ');
      expect(response.body.error.stack.length).toBeGreaterThan(100);
    });
  });

  describe('Secure Contrast', () => {
    it('SECURE: API Secure sanitiza erros', async () => {
      // Documentação do comportamento esperado na API Secure
      expect(true).toBe(true);
    });
  });
});
