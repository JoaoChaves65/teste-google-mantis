import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import {
  PgCustomerRepository,
  PgUserRepository,
  PgAppointmentRepository,
} from '@barberlab/core/infrastructure';
import {
  CreateCustomer,
  GetCustomer,
  ListCustomers,
  UpdateCustomer,
} from '@barberlab/core/application';
import { authMiddleware } from '../../http/middleware/auth';
import { requireRole } from '../../http/middleware/rbac';
import type { AuthenticatedRequest } from '../../http/middleware/auth';
import { AppError } from '@barberlab/core';
import type { UserRole } from '@barberlab/core';

const router = Router();

const createCustomerSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(50),
  email: z.string().email().optional(),
  birthDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  birthDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

const listCustomersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(authMiddleware);

async function checkCustomerAccess(
  req: AuthenticatedRequest,
  customerId: string
): Promise<{ allowed: boolean; customer?: { userId: string | null }; notFound?: boolean }> {
  const executor = createSqlExecutor();
  const customersRepo = new PgCustomerRepository(executor);
  const customer = await customersRepo.findById(customerId);
  if (!customer) {
    return { allowed: false, notFound: true };
  }

  const userRole = req.user!.role as UserRole;
  const userId = req.user!.sub;

  if (userRole === 'ADMIN') {
    return { allowed: true, customer };
  }

  if (userRole === 'CUSTOMER' && customer.userId === userId) {
    return { allowed: true, customer };
  }

  if (userRole === 'BARBER') {
    const appointmentsRepo = new PgAppointmentRepository(executor);
    const barbersRepo = new (await import('@barberlab/core/infrastructure')).PgBarberRepository(
      executor
    );
    const barber = await barbersRepo.findByUserId(userId);
    if (!barber) {
      return { allowed: false, customer };
    }
    const appointments = await appointmentsRepo.findAll({ page: 1, limit: 1000 });
    const hasRelation = appointments.data.some(
      a => a.customerId === customerId && a.barberId === barber.id
    );
    return { allowed: hasRelation, customer };
  }

  return { allowed: false };
}

router.post('/', requireRole('ADMIN', 'BARBER'), async (req: AuthenticatedRequest, res) => {
  const parseResult = createCustomerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const customersRepo = new PgCustomerRepository(executor);
  const usersRepo = new PgUserRepository(executor);
  const createCustomer = new CreateCustomer(customersRepo, usersRepo);

  const input = {
    ...parseResult.data,
    birthDate: parseResult.data.birthDate ? new Date(parseResult.data.birthDate) : undefined,
  };

  const customer = await createCustomer.execute(input);
  res.status(201).json({
    id: customer.id,
    userId: customer.userId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    birthDate: customer.birthDate,
    notes: customer.notes,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  });
});

router.get(
  '/',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
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

    const userRole = req.user!.role as UserRole;
    const userId = req.user!.sub;

    let result;
    if (userRole === 'ADMIN') {
      result = await listCustomers.execute(parseResult.data);
    } else if (userRole === 'CUSTOMER') {
      const customer = await customersRepo.findByUserId(userId);
      if (!customer) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      result = await listCustomers.execute(parseResult.data);
      result.data = result.data.filter(c => c.userId === userId);
    } else if (userRole === 'BARBER') {
      const appointmentsRepo = new PgAppointmentRepository(executor);
      const appointments = await appointmentsRepo.findAll({ page: 1, limit: 1000 });
      const customerIds = new Set(
        appointments.data.filter(a => a.barberId === userId).map(a => a.customerId)
      );
      result = await listCustomers.execute(parseResult.data);
      result.data = result.data.filter(c => customerIds.has(c.id));
    } else {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(result);
  }
);

router.get(
  '/:id',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = idParamSchema.safeParse(req.params);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid customer ID', details: parseResult.error.flatten() });
      return;
    }

    const access = await checkCustomerAccess(req, parseResult.data.id);
    if (access.notFound) {
      throw AppError.notFound('Customer', parseResult.data.id);
    }
    if (!access.allowed || !access.customer) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const executor = createSqlExecutor();
    const customersRepo = new PgCustomerRepository(executor);
    const getCustomer = new GetCustomer(customersRepo);

    const customer = await getCustomer.execute({ id: parseResult.data.id });
    if (!customer) {
      throw AppError.notFound('Customer', parseResult.data.id);
    }

    res.json({
      id: customer.id,
      userId: customer.userId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      birthDate: customer.birthDate,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    });
  }
);

router.patch('/:id', requireRole('ADMIN', 'CUSTOMER'), async (req: AuthenticatedRequest, res) => {
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

  const access = await checkCustomerAccess(req, paramsResult.data.id);
  if (access.notFound) {
    throw AppError.notFound('Customer', paramsResult.data.id);
  }
  if (!access.allowed || !access.customer) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const userRole = req.user!.role as UserRole;
  if (userRole === 'CUSTOMER' && access.customer.userId !== req.user!.sub) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const executor = createSqlExecutor();
  const customersRepo = new PgCustomerRepository(executor);
  const updateCustomer = new UpdateCustomer(customersRepo);

  const input = {
    id: paramsResult.data.id,
    ...bodyResult.data,
    birthDate: bodyResult.data.birthDate ? new Date(bodyResult.data.birthDate) : undefined,
  };

  const customer = await updateCustomer.execute(input);

  res.json({
    id: customer.id,
    userId: customer.userId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    birthDate: customer.birthDate,
    notes: customer.notes,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  });
});

export const customersRouter = router;
