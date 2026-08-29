import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('unauthenticated user is redirected to /login when accessing protected route', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.getByText('Email ou senha inválidos')).toBeVisible();
  });

  test('session persists after reload', async ({ page }) => {
    await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.reload();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('logout ends session and redirects to login', async ({ page }) => {
    await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    await page.click('button:has-text("Sair")');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('refresh token is not accessible in localStorage or JavaScript', async ({ page }) => {
    await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');

    const localStorage = await page.evaluate(() => {
      const items: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) items[key] = window.localStorage.getItem(key) || '';
      }
      return items;
    });

    expect(localStorage.refresh_token).toBeUndefined();
    expect(localStorage.refreshToken).toBeUndefined();
  });
});
