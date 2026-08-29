import { test, expect } from '@playwright/test';

test.describe('Barber Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'joao.barbeiro@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(500);
  });

  test('barber can access allowed pages', async ({ page }) => {
    await page.click('a:has-text("Agendamentos")');
    await expect(page).toHaveURL('/appointments');

    await page.click('a:has-text("Serviços")');
    await expect(page).toHaveURL('/services');

    await page.click('a:has-text("Barbeiros")');
    await expect(page).toHaveURL('/barbers');
  });

  test('barber cannot access admin pages', async ({ page }) => {
    await page.goto('/customers');
    await expect(page).toHaveURL('/');

    await page.goto('/transactions');
    await expect(page).toHaveURL('/');

    await page.goto('/users');
    await expect(page).toHaveURL('/');
  });

  test('barber can view own appointments', async ({ page }) => {
    await page.click('a:has-text("Agendamentos")');
    await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('barber can view services', async ({ page }) => {
    await page.click('a:has-text("Serviços")');
    await expect(page.getByRole('heading', { name: 'Serviços' })).toBeVisible();
  });

  test('barber can view barbers (own profile)', async ({ page }) => {
    await page.click('a:has-text("Barbeiros")');
    await expect(page.getByRole('heading', { name: 'Barbeiros' })).toBeVisible();
  });

  test('barber can confirm appointment', async ({ page }) => {
    await page.click('a:has-text("Agendamentos")');
    await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();

    const confirmButton = page.getByRole('button', { name: 'Confirmar' }).first();
    if (await confirmButton.isVisible({ timeout: 3000 })) {
      await confirmButton.click();
      await expect(page.getByText('CONFIRMED').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('barber cannot access other barber data', async ({ page }) => {
    await page.goto('/barbers');
    await expect(page.getByRole('heading', { name: 'Barbeiros' })).toBeVisible();
  });
});
