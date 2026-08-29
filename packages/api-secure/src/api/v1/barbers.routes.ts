import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import { PgBarberRepository, PgUserRepository } from '@barberlab/core/infrastructure';
import { CreateBarber, GetBarber, ListBarbers, UpdateBarber } from '@barberlab/core/application';
import { authMiddleware } from '../../http/middleware/auth';
import { requireRole } from '../../http/middleware/rbac';
import type { AuthenticatedRequest } from '../../http/middleware/auth';
import { AppError } from '@barberlab/core';
import type { UserRole } from '@barberlab/core';

const router = Router();

const createBarberSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  phone: z.string().max(50).optional(),
  specialty: z.string().max(100).optional(),
  hireDate: z.string().datetime().optional(),
});

const updateBarberSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  specialty: z.string().max(100).optional(),
  active: z.boolean().optional(),
});

const listBarbersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(authMiddleware);

async function checkBarberAccess(
  req: AuthenticatedRequest,
  barberId: string
): Promise<{ allowed: boolean; barber?: { userId: string | null }; notFound?: boolean }> {
  const executor = createSqlExecutor();
  const barbersRepo = new PgBarberRepository(executor);
  const barber = await barbersRepo.findById(barberId);
  if (!barber) {
    return { allowed: false, notFound: true };
  }

  const userRole = req.user!.role as UserRole;
  const userId = req.user!.sub;

  if (userRole === 'ADMIN') {
    return { allowed: true, barber };
  }

  if (userRole === 'BARBER' && barber.userId === userId) {
    return { allowed: true, barber };
  }

  if (userRole === 'CUSTOMER') {
    return { allowed: true, barber };
  }

  return { allowed: false };
}

router.post('/', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
  const parseResult = createBarberSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const barbersRepo = new PgBarberRepository(executor);
  const usersRepo = new PgUserRepository(executor);
  const createBarber = new CreateBarber(barbersRepo, usersRepo);

  const input = {
    ...parseResult.data,
    hireDate: parseResult.data.hireDate ? new Date(parseResult.data.hireDate) : undefined,
  };

  const barber = await createBarber.execute(input);
  res.status(201).json({
    id: barber.id,
    userId: barber.userId,
    name: barber.name,
    phone: barber.phone,
    specialty: barber.specialty,
    hireDate: barber.hireDate,
    active: barber.active,
    createdAt: barber.createdAt,
    updatedAt: barber.updatedAt,
  });
});

router.get(
  '/',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
    const parseResult = listBarbersSchema.safeParse(req.query);
    if (!parseResult.success) {
      res
        .status(400)
        .json({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const barbersRepo = new PgBarberRepository(executor);
    const listBarbers = new ListBarbers(barbersRepo);

    const userRole = req.user!.role as UserRole;
    let result;

    if (userRole === 'ADMIN') {
      result = await listBarbers.execute(parseResult.data);
    } else if (userRole === 'BARBER') {
      result = await listBarbers.execute(parseResult.data);
      result.data = result.data.filter(b => b.userId === req.user!.sub);
    } else if (userRole === 'CUSTOMER') {
      result = await listBarbers.execute(parseResult.data);
      result.data = result.data.filter(b => b.active);
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
      res.status(400).json({ error: 'Invalid barber ID', details: parseResult.error.flatten() });
      return;
    }

    const access = await checkBarberAccess(req, parseResult.data.id);
    if (access.notFound) {
      throw AppError.notFound('Barber', parseResult.data.id);
    }
    if (!access.allowed || !access.barber) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const executor = createSqlExecutor();
    const barbersRepo = new PgBarberRepository(executor);
    const getBarber = new GetBarber(barbersRepo);

    const barber = await getBarber.execute({ id: parseResult.data.id });
    if (!barber) {
      throw AppError.notFound('Barber', parseResult.data.id);
    }

    res.json({
      id: barber.id,
      userId: barber.userId,
      name: barber.name,
      phone: barber.phone,
      specialty: barber.specialty,
      hireDate: barber.hireDate,
      active: barber.active,
      createdAt: barber.createdAt,
      updatedAt: barber.updatedAt,
    });
  }
);

router.patch('/:id', requireRole('ADMIN', 'BARBER'), async (req: AuthenticatedRequest, res) => {
  const paramsResult = idParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: 'Invalid barber ID', details: paramsResult.error.flatten() });
    return;
  }

  const bodyResult = updateBarberSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: bodyResult.error.flatten() });
    return;
  }

  const access = await checkBarberAccess(req, paramsResult.data.id);
  if (access.notFound) {
    throw AppError.notFound('Barber', paramsResult.data.id);
  }
  if (!access.allowed || !access.barber) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const userRole = req.user!.role as UserRole;
  if (userRole === 'BARBER' && access.barber.userId !== req.user!.sub) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const executor = createSqlExecutor();
  const barbersRepo = new PgBarberRepository(executor);
  const updateBarber = new UpdateBarber(barbersRepo);

  const barber = await updateBarber.execute({
    id: paramsResult.data.id,
    ...bodyResult.data,
  });

  res.json({
    id: barber.id,
    userId: barber.userId,
    name: barber.name,
    phone: barber.phone,
    specialty: barber.specialty,
    hireDate: barber.hireDate,
    active: barber.active,
    createdAt: barber.createdAt,
    updatedAt: barber.updatedAt,
  });
});

export const barbersRouter = router;
