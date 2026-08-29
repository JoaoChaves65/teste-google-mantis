import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import { PgBarberRepository, PgUserRepository } from '@barberlab/core/infrastructure';
import { CreateBarber, GetBarber, ListBarbers, UpdateBarber } from '@barberlab/core/application';
import { vulnerableAuthMiddleware } from '../../http/middleware/vulnerableAuth';
import { vulnerableRequireRole } from '../../http/middleware/vulnerableRbac';
import { UserRole } from '@barberlab/core';

const router = Router();

const createBarberSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(20),
  specialty: z.string().max(100).optional(),
  hireDate: z.string().datetime(),
  active: z.boolean().optional(),
});

const updateBarberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  specialty: z.string().max(100).optional(),
  hireDate: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const listBarbersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

router.use(vulnerableAuthMiddleware);

router.get(
  '/',
  vulnerableRequireRole(UserRole.ADMIN, UserRole.BARBER, UserRole.CUSTOMER),
  async (req, res) => {
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

    const result = await listBarbers.execute(parseResult.data);
    res.json(result);
  }
);

router.get('/:id', async (req, res) => {
  const parseResult = idParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid barber ID', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const barbersRepo = new PgBarberRepository(executor);
  const getBarber = new GetBarber(barbersRepo);

  const barber = await getBarber.execute({ id: parseResult.data.id });
  if (!barber) {
    res.status(404).json({ error: 'Barber not found' });
    return;
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
});

router.post('/', async (req, res) => {
  const parseResult = createBarberSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const barbersRepo = new PgBarberRepository(executor);
  const usersRepo = new PgUserRepository(executor);
  const createBarber = new CreateBarber(barbersRepo, usersRepo);

  const barber = await createBarber.execute({
    ...parseResult.data,
    hireDate: new Date(parseResult.data.hireDate),
  });
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

router.patch('/:id', async (req, res) => {
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

  const executor = createSqlExecutor();
  const barbersRepo = new PgBarberRepository(executor);
  const updateBarber = new UpdateBarber(barbersRepo);

  const barber = await updateBarber.execute({ id: paramsResult.data.id, ...bodyResult.data });
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
