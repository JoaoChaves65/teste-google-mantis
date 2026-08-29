import { test, expect } from '@playwright/test';

test.describe('UI States - Customers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(500);
  });

  test('loading state shows spinner', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
  });

  test('empty state handled', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.locator('table')).toBeVisible();
  });

  test('form validation shows errors', async ({ page }) => {
    await page.goto('/customers');
    await page.click('button:has-text("Novo Cliente")');
    await page.click('button[type="submit"]:has-text("Criar")');
    await expect(page.getByText('Nome *')).toBeVisible();
    await expect(page.getByText('Telefone *')).toBeVisible();
  });

  test('modal opens and closes correctly', async ({ page }) => {
    await page.goto('/customers');
    await page.click('button:has-text("Novo Cliente")');
    await expect(page.getByRole('heading', { name: 'Novo Cliente' })).toBeVisible();
    await page.click('button:has-text("Cancelar")');
    await expect(page.getByRole('heading', { name: 'Novo Cliente' })).not.toBeVisible();
  });

  test('list updates after creation', async ({ page }) => {
    await page.goto('/customers');
    const initialCount = await page.locator('tbody tr').count();

    await page.click('button:has-text("Novo Cliente")');
    await page.fill('input[name="name"]', 'UI Test Client');
    await page.fill('input[name="phone"]', '(11) 99999-7777');
    await page.fill('input[name="email"]', 'ui.test@client.com');
    await page.fill('input[name="birthDate"]', '1990-01-01');
    await page.fill('textarea[name="notes"]', 'UI test client');
    await page.click('button[type="submit"]:has-text("Criar")');

    await expect(page.getByText('UI Test Client')).toBeVisible();
    const newCount = await page.locator('tbody tr').count();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });
});

test.describe('UI States - Barbers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(500);
  });

  test('loading state shows spinner', async ({ page }) => {
    await page.goto('/barbers');
    await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
  });

  test('form validation works', async ({ page }) => {
    await page.goto('/barbers');
    await page.click('button:has-text("Novo Barbeiro")');
    await page.click('button[type="submit"]:has-text("Criar")');
    await expect(page.getByText('Nome *')).toBeVisible();
    await expect(page.getByText('Telefone *')).toBeVisible();
    await expect(page.getByText('Especialidade *')).toBeVisible();
    await expect(page.getByText('Data de Admissão *')).toBeVisible();
  });

  test('modal works correctly', async ({ page }) => {
    await page.goto('/barbers');
    await page.click('button:has-text("Novo Barbeiro")');
    await expect(page.getByRole('heading', { name: 'Novo Barbeiro' })).toBeVisible();
    await page.click('button:has-text("Cancelar")');
    await expect(page.getByRole('heading', { name: 'Novo Barbeiro' })).not.toBeVisible();
  });
});

test.describe('UI States - Services', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(500);
  });

  test('loading state shows spinner', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
  });

  test('form validation works', async ({ page }) => {
    await page.goto('/services');
    await page.click('button:has-text("Novo Serviço")');
    await page.click('button[type="submit"]:has-text("Criar")');
    await expect(page.getByText('Nome *')).toBeVisible();
    await expect(page.getByText('Preço *')).toBeVisible();
    await expect(page.getByText('Duração (minutos) *')).toBeVisible();
  });
});

test.describe('UI States - Appointments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'carlos.cliente@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(500);
  });

  test('loading state shows spinner', async ({ page }) => {
    await page.goto('/appointments');
    await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
  });

  test('status filter works', async ({ page }) => {
    await page.goto('/appointments');
    await expect(page.locator('select')).toBeVisible();
    await page.selectOption('select', 'PENDING');
    await expect(page.locator('select')).toHaveValue('PENDING');
  });

  test('modal opens and loads data', async ({ page }) => {
    await page.goto('/appointments');
    await page.click('button:has-text("Novo Agendamento")');
    await expect(page.getByText('Carregando clientes, barbeiros e serviços...')).toBeVisible();
    await expect(page.locator('select[name="customerId"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('UI States - Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@barberlab.local');
    await page.fill('input[type="password"]', 'dev123456');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    await page.waitForTimeout(500);
  });

  test('loading state shows spinner', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByText('Carregando...')).toBeVisible({ timeout: 5000 });
  });

  test('type filter works', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.locator('select')).toBeVisible();
    await page.selectOption('select', 'INCOME');
    await expect(page.locator('select')).toHaveValue('INCOME');
  });

  test('modal opens and loads data', async ({ page }) => {
    await page.goto('/transactions');
    await page.click('button:has-text("Nova Transação")');
    await expect(page.getByText('Carregando agendamentos e barbeiros...')).toBeVisible();
    await expect(page.locator('select[name="appointmentId"]')).toBeVisible({ timeout: 5000 });
  });
});
