import { test } from '@playwright/test';

test('debug session persist after reload - with console', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('request', req => console.log('REQUEST:', req.method(), req.url()));
  page.on('response', res => console.log('RESPONSE:', res.status(), res.url()));

  // Step 1: Login
  await page.goto('/login');
  await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
  await page.fill('input[type="password"]', 'dev123456');
  await page.click('button[type="submit"]');

  await page.waitForURL('/', { timeout: 10000 });
  console.log('After login, URL:', page.url());

  // Step 2: Reload page
  await page.reload();
  console.log('After reload, URL:', page.url());

  // Wait for auth to restore
  await page.waitForTimeout(5000);
  console.log('After wait, URL:', page.url());

  // Check if user is in the page
  const dashboardHeading = await page
    .getByRole('heading', { name: 'Dashboard' })
    .isVisible()
    .catch(() => false);
  console.log('Dashboard heading visible:', dashboardHeading);

  // Check URL
  console.log('Final URL:', page.url());
});
