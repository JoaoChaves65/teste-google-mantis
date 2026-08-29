import { test } from '@playwright/test';

test('debug cookie headers', async ({ page }) => {
  page.on('response', res => {
    if (res.url().includes('/auth/login')) {
      const headers = res.headers();
      console.log('Login response headers:', headers);
      if (headers['set-cookie']) {
        console.log('SET-COOKIE header:', headers['set-cookie']);
      }
    }
  });

  await page.goto('/login');
  await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
  await page.fill('input[type="password"]', 'dev123456');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);

  const cookies = await page.context().cookies();
  console.log('All cookies:', cookies);
});
