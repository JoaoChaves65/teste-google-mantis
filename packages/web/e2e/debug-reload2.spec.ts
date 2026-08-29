import { test } from '@playwright/test';

test('debug session persist after reload - detailed', async ({ page }) => {
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

  // Check cookies and sessionStorage after login
  const cookiesAfterLogin = await page.context().cookies();
  console.log(
    'Cookies after login:',
    cookiesAfterLogin.map(c => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      sameSite: c.sameSite,
      secure: c.secure,
      httpOnly: c.httpOnly,
    }))
  );

  const sessionStorageAfterLogin = await page.evaluate(() => {
    const items: Record<string, string> = {};
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key) items[key] = window.sessionStorage.getItem(key) || '';
    }
    return items;
  });
  console.log('SessionStorage after login:', sessionStorageAfterLogin);

  // Step 2: Reload page
  await page.reload();
  console.log('After reload, URL:', page.url());

  // Wait for auth to restore
  await page.waitForTimeout(5000);
  console.log('After wait, URL:', page.url());

  // Check cookies after reload
  const cookiesAfterReload = await page.context().cookies();
  console.log(
    'Cookies after reload:',
    cookiesAfterReload.map(c => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      sameSite: c.sameSite,
      secure: c.secure,
      httpOnly: c.httpOnly,
    }))
  );

  // Check sessionStorage after reload
  const sessionStorageAfterReload = await page.evaluate(() => {
    const items: Record<string, string> = {};
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key) items[key] = window.sessionStorage.getItem(key) || '';
    }
    return items;
  });
  console.log('SessionStorage after reload:', sessionStorageAfterReload);

  // Check if user is in the page
  const dashboardHeading = await page
    .getByRole('heading', { name: 'Dashboard' })
    .isVisible()
    .catch(() => false);
  console.log('Dashboard heading visible:', dashboardHeading);

  // Check URL
  console.log('Final URL:', page.url());
});
