import { test, expect } from '@playwright/test';

test.describe('Customer Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(500);
  });

  test('customer can access allowed pages', async ({ page }) => {
    await page.click('a:has-text("Agendamentos")');
    await expect(page).toHaveURL('/appointments');

    await page.click('a:has-text("Serviços")');
    await expect(page).toHaveURL('/services');

    await page.click('a:has-text("Barbeiros")');
    await expect(page).toHaveURL('/barbers');
  });

  test('customer cannot access admin pages', async ({ page }) => {
    await page.goto('/customers');
    await expect(page).toHaveURL('/');

    await page.goto('/transactions');
    await expect(page).toHaveURL('/');

    await page.goto('/users');
    await expect(page).toHaveURL('/');
  });

  test('customer can view services list', async ({ page }) => {
    await page.click('a:has-text("Serviços")');
    await expect(page.getByRole('heading', { name: 'Serviços' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('customer can view barbers list', async ({ page }) => {
    await page.click('a:has-text("Barbeiros")');
    await expect(page.getByRole('heading', { name: 'Barbeiros' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('customer can create appointment', async ({ page }) => {
    await page.click('a:has-text("Agendamentos")');
    await expect(page).toHaveURL('/appointments');

    await page.click('button:has-text("Novo Agendamento")');
    await expect(page.getByRole('heading', { name: 'Novo Agendamento' })).toBeVisible();

    await page.selectOption('select[name="customerId"]', { label: /carlos\.cliente/ });
    await page.selectOption('select[name="barberId"]', { label: /joao\.barbeiro/ });
    await page.selectOption('select[name="serviceId"]', { label: /Corte/ });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[name="dateTime"]', dateStr);

    await page.click('button[type="submit"]:has-text("Criar")');
    await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
  });

  test('customer can view own appointments', async ({ page }) => {
    await page.click('a:has-text("Agendamentos")');
    await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
