import { test, expect } from '@playwright/test';

test.describe('Admin Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(500);
  });

  test('admin can access all pages', async ({ page }) => {
    await page.click('a:has-text("Dashboard")');
    await expect(page).toHaveURL('/');

    await page.click('a:has-text("Clientes")');
    await expect(page).toHaveURL('/customers');

    await page.click('a:has-text("Barbeiros")');
    await expect(page).toHaveURL('/barbers');

    await page.click('a:has-text("Serviços")');
    await expect(page).toHaveURL('/services');

    await page.click('a:has-text("Agendamentos")');
    await expect(page).toHaveURL('/appointments');

    await page.click('a:has-text("Transações")');
    await expect(page).toHaveURL('/transactions');

    await page.click('a:has-text("Usuários")');
    await expect(page).toHaveURL('/users');
  });

  test('admin can access customers page', async ({ page }) => {
    await page.click('a:has-text("Clientes")');
    await expect(page).toHaveURL('/customers');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('admin can create customer', async ({ page }) => {
    await page.click('a:has-text("Clientes")');
    await page.click('button:has-text("Novo Cliente")');
    await expect(page.getByRole('heading', { name: 'Novo Cliente' })).toBeVisible();

    await page.fill('input[name="name"]', 'Teste Cliente');
    await page.fill('input[name="phone"]', '(11) 99999-8888');
    await page.fill('input[name="email"]', 'teste@cliente.com');
    await page.fill('input[name="birthDate"]', '1990-01-01');
    await page.fill('textarea[name="notes"]', 'Cliente de teste');

    await page.click('button[type="submit"]:has-text("Criar")');
    await expect(page.getByText('Teste Cliente')).toBeVisible();
  });

  test('admin can access barbers page', async ({ page }) => {
    await page.click('a:has-text("Barbeiros")');
    await expect(page).toHaveURL('/barbers');
    await expect(page.getByRole('heading', { name: 'Barbeiros' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('admin can create barber', async ({ page }) => {
    await page.click('a:has-text("Barbeiros")');
    await page.click('button:has-text("Novo Barbeiro")');
    await expect(page.getByRole('heading', { name: 'Novo Barbeiro' })).toBeVisible();

    await page.fill('input[name="name"]', 'Teste Barbeiro');
    await page.fill('input[name="phone"]', '(11) 98888-7777');
    await page.fill('input[name="specialty"]', 'Corte moderno');
    await page.fill('input[name="hireDate"]', '2024-01-15');

    await page.click('button[type="submit"]:has-text("Criar")');
    await expect(page.getByText('Teste Barbeiro')).toBeVisible();
  });

  test('admin can access services page', async ({ page }) => {
    await page.click('a:has-text("Serviços")');
    await expect(page).toHaveURL('/services');
    await expect(page.getByRole('heading', { name: 'Serviços' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('admin can create service', async ({ page }) => {
    await page.click('a:has-text("Serviços")');
    await page.click('button:has-text("Novo Serviço")');
    await expect(page.getByRole('heading', { name: 'Novo Serviço' })).toBeVisible();

    await page.fill('input[name="name"]', 'Teste Serviço');
    await page.fill('textarea[name="description"]', 'Descrição do teste');
    await page.fill('input[name="price"]', '50.00');
    await page.fill('input[name="durationMinutes"]', '30');

    await page.click('button[type="submit"]:has-text("Criar")');
    await expect(page.getByText('Teste Serviço')).toBeVisible();
  });

  test('admin can access appointments page', async ({ page }) => {
    await page.click('a:has-text("Agendamentos")');
    await expect(page).toHaveURL('/appointments');
    await expect(page.getByRole('heading', { name: 'Agendamentos' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('admin can access transactions page', async ({ page }) => {
    await page.click('a:has-text("Transações")');
    await expect(page).toHaveURL('/transactions');
    await expect(page.getByRole('heading', { name: 'Transações' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('admin can access users page', async ({ page }) => {
    await page.click('a:has-text("Usuários")');
    await expect(page).toHaveURL('/users');
    await expect(page.getByRole('heading', { name: 'Usuários' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });
});
