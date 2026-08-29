import { test } from '@playwright/test';

test('debug login', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('request', req => console.log('REQUEST:', req.method(), req.url()));
  page.on('response', res => console.log('RESPONSE:', res.status(), res.url()));

  await page.goto('/login');
  await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
  await page.fill('input[type="password"]', 'dev123456');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000);
  console.log('URL after login:', page.url());

  const content = await page.content();
  console.log('Page content:', content.substring(0, 3000));
});
