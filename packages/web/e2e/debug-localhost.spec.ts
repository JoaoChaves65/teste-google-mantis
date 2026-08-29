import { test } from '@playwright/test';

test('test localhost API', async ({ page }) => {
  const response = await page.request.post('http://localhost:3001/auth/login', {
    data: {
      email: 'carlos.cliente@barberlab.local',
      password: 'dev123456',
    },
  });

  console.log('Status:', response.status());
  const headers = response.headers();
  console.log('Response headers:', headers);
  if (headers['set-cookie']) {
    console.log('SET-COOKIE:', headers['set-cookie']);
  }
});
