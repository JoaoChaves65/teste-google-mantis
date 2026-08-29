import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../http/app';

describe('api-secure /health', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  it('GET /health should return ok', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'api-secure',
    });
    expect(response.body.timestamp).toBeDefined();
    expect(typeof response.body.uptime).toBe('number');
  });
});
