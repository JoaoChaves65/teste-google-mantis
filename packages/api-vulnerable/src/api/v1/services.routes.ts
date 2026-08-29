import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import { PgServiceRepository } from '@barberlab/core/infrastructure';
import {
  CreateService,
  GetService,
  ListServices,
  UpdateService,
} from '@barberlab/core/application';
import { vulnerableAuthMiddleware } from '../../http/middleware/vulnerableAuth';
import { vulnerableRequireRole } from '../../http/middleware/vulnerableRbac';
import { UserRole } from '@barberlab/core';
import { Money } from '@barberlab/core';

const router = Router();

const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/),
  durationMinutes: z.number().int().positive(),
  // VULNERÁVEL: Mass Assignment - aceita active
  active: z.boolean().optional(),
});

const updateServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  durationMinutes: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

const listServicesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

router.use(vulnerableAuthMiddleware);

router.get(
  '/',
  vulnerableRequireRole(UserRole.ADMIN, UserRole.BARBER, UserRole.CUSTOMER),
  async (req, res) => {
    const parseResult = listServicesSchema.safeParse(req.query);
    if (!parseResult.success) {
      res
        .status(400)
        .json({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
      return;
    }

    const executor = createSqlExecutor();
    const servicesRepo = new PgServiceRepository(executor);
    const listServices = new ListServices(servicesRepo);

    const result = await listServices.execute(parseResult.data);
    res.json(result);
  }
);

router.get('/:id', async (req, res) => {
  const parseResult = idParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid service ID', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const servicesRepo = new PgServiceRepository(executor);
  const getService = new GetService(servicesRepo);

  const service = await getService.execute({ id: parseResult.data.id });
  if (!service) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  res.json({
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
    active: service.active,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  });
});

router.post('/', async (req, res) => {
  const parseResult = createServiceSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const servicesRepo = new PgServiceRepository(executor);
  const createService = new CreateService(servicesRepo);

  const service = await createService.execute({
    ...parseResult.data,
    price: Money.fromDecimal(parseResult.data.price),
  });
  res.status(201).json({
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
    active: service.active,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  });
});

router.patch('/:id', async (req, res) => {
  const paramsResult = idParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    res.status(400).json({ error: 'Invalid service ID', details: paramsResult.error.flatten() });
    return;
  }

  const bodyResult = updateServiceSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: bodyResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const servicesRepo = new PgServiceRepository(executor);
  const updateService = new UpdateService(servicesRepo);

  const service = await updateService.execute({
    id: paramsResult.data.id,
    ...bodyResult.data,
    price: bodyResult.data.price ? Money.fromDecimal(bodyResult.data.price) : undefined,
  });
  res.json({
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
    active: service.active,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  });
});

export const servicesRouter = router;
