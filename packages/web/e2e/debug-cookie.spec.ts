import { test } from '@playwright/test';

test('debug cookie', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('request', req => console.log('REQUEST:', req.method(), req.url()));
  page.on('response', res => {
    const headers = res.headers();
    if (headers['set-cookie']) {
      console.log('SET-COOKIE:', headers['set-cookie']);
    }
  });

  await page.goto('/login');
  await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
  await page.fill('input[type="password"]', 'dev123456');
  await page.click('button[type="submit"]');

  await page.waitForURL('/', { timeout: 10000 });

  // Check all cookies
  const cookies = await page.context().cookies();
  console.log('All cookies:', cookies);

  // Check if refresh_token cookie exists
  const refreshCookie = cookies.find(c => c.name === 'refresh_token');
  console.log('Refresh cookie:', refreshCookie);
});
