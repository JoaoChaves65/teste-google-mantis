import { test } from '@playwright/test';

test('test API directly', async ({ page }) => {
  const response = await page.request.post('http://172.17.0.1:3001/auth/login', {
    data: {
      email: 'carlos.cliente@barberlab.local',
      password: 'dev123456',
    },
  });

  console.log('Status:', response.status());
  const headers = response.headers();
  console.log('Response headers:', headers);
  const body = await response.json();
  console.log('Response body:', body);
});
