import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import { PgCustomerRepository, PgUserRepository } from '@barberlab/core/infrastructure';
import {
  CreateCustomer,
  GetCustomer,
  ListCustomers,
  UpdateCustomer,
} from '@barberlab/core/application';
import { vulnerableAuthMiddleware } from '../../http/middleware/vulnerableAuth';
import { vulnerableRequireRole } from '../../http/middleware/vulnerableRbac';
import type { VulnerableAuthenticatedRequest } from '../../http/middleware/vulnerableRbac';
import { UserRole } from '@barberlab/core';

const router = Router();

const createCustomerSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional(),
  birthDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  // VULNERÁVEL: Mass Assignment - aceita role
  role: z.string().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().optional(),
  birthDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  // VULNERÁVEL: Mass Assignment - aceita role
  role: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const listCustomersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

router.use(vulnerableAuthMiddleware);

router.get('/', vulnerableRequireRole(UserRole.ADMIN, UserRole.BARBER), async (req, res) => {
  const parseResult = listCustomersSchema.safeParse(req.query);
  if (!parseResult.success) {
    res
      .status(400)
      .json({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const customersRepo = new PgCustomerRepository(executor);
  const listCustomers = new ListCustomers(customersRepo);

  const result = await listCustomers.execute(parseResult.data);
  res.json(result);
});

router.get(
  '/:id',
  vulnerableRequireRole(UserRole.ADMIN, UserRole.BARBER, UserRole.CUSTOMER),
  async (req: VulnerableAuthenticatedRequest, res) => {
    const parseResult = idParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid customer ID', details: parseResult.error.flatten() });
      return;
    }

    // VULNERÁVEL: IDOR - Não verifica se o CUSTOMER está acessando seu próprio recurso
    // VULNERÁVEL: BARBER pode acessar qualquer customer sem verificação
    const executor = createSqlExecutor();
    const customersRepo = new PgCustomerRepository(executor);
    const getCustomer = new GetCustomer(customersRepo);

    const customer = await getCustomer.execute({ id: parseResult.data.id });
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    // VULNERÁVEL: Não verifica ownership
    // ADMIN pode ver tudo, BARBER vê tudo, CUSTOMER vê tudo (deveria ver apenas seu próprio)
    res.json({
      id: customer.id,
      userId: customer.userId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? undefined,
      birthDate: customer.birthDate,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });
  }
);

router.post(
  '/',
  vulnerableRequireRole(UserRole.ADMIN, UserRole.BARBER),
  async (req: VulnerableAuthenticatedRequest, res) => {
    const parseResult = createCustomerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
      return;
    }

    // VULNERÁVEL: Mass Assignment - aceita campo 'role'
    const { role, ...data } = parseResult.data;

    // VULNERÁVEL: CUSTOMER pode criar customer com role ADMIN
    // VULNERÁVEL: BARBER pode criar customer com role ADMIN
    // Não valida se o usuário tem permissão para definir role

    const executor = createSqlExecutor();
    const customersRepo = new PgCustomerRepository(executor);
    const usersRepo = new PgUserRepository(executor);
    const createCustomer = new CreateCustomer(customersRepo, usersRepo);

    const input = {
      ...data,
      userId: req.user!.sub,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    };

    // VULNERÁVEL: Se role for enviado, sobrescreve a role do usuário
    // (apenas ADMIN deveria poder fazer isso)
    if (role) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (input as any).role = role; // VULNERÁVEL: Mass assignment de role
    }

    const customer = await createCustomer.execute(input);
    res.status(201).json({
      id: customer.id,
      userId: customer.userId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? undefined,
      birthDate: customer.birthDate,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });
  }
);

router.patch(
  '/:id',
  vulnerableRequireRole(UserRole.ADMIN, UserRole.BARBER, UserRole.CUSTOMER),
  async (req: VulnerableAuthenticatedRequest, res) => {
    const paramsResult = idParamSchema.safeParse(req.params);
    if (!paramsResult.success) {
      res.status(400).json({ error: 'Invalid customer ID', details: paramsResult.error.flatten() });
      return;
    }

    const bodyResult = updateCustomerSchema.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: 'Invalid request body', details: bodyResult.error.flatten() });
      return;
    }

    // VULNERÁVEL: Mass Assignment - aceita campo 'role'
    const { role, ...data } = bodyResult.data;

    // VULNERÁVEL: CUSTOMER pode alterar role para ADMIN
    // VULNERÁVEL: BARBER pode alterar role para ADMIN
    // Não verifica se o usuário tem permissão para alterar role

    const executor = createSqlExecutor();
    const customersRepo = new PgCustomerRepository(executor);
    const updateCustomer = new UpdateCustomer(customersRepo);

    // VULNERÁVEL: IDOR - CUSTOMER pode atualizar customer de outro usuário
    // VULNERÁVEL: BARBER pode atualizar qualquer customer
    // Não verifica ownership
    const input = {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    };

    // VULNERÁVEL: Mass assignment de role
    if (role) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (input as any).role = role; // VULNERÁVEL: Mass assignment de role
    }

    const customer = await updateCustomer.execute({ id: paramsResult.data.id, ...input });
    res.json({
      id: customer.id,
      userId: customer.userId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email ?? undefined,
      birthDate: customer.birthDate,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });
  }
);

export const customersRouter = router;
