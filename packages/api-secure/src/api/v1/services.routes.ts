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
import { authMiddleware } from '../../http/middleware/auth';
import { requireRole } from '../../http/middleware/rbac';
import type { AuthenticatedRequest } from '../../http/middleware/auth';
import { AppError } from '@barberlab/core';
import { Money } from '@barberlab/core/domain';

const router = Router();

const priceSchema = z.string().regex(/^\d+(\.\d{1,2})?$/);

const createServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  price: priceSchema,
  durationMinutes: z.number().int().positive(),
});

const updateServiceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  price: priceSchema.optional(),
  durationMinutes: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

const listServicesSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  activeOnly: z.coerce.boolean().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

function toMoney(priceStr: string): Money {
  return Money.fromDecimal(priceStr);
}

router.use(authMiddleware);

router.post('/', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
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
    price: toMoney(parseResult.data.price),
  });

  res.status(201).json({
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price.toDecimal(),
    durationMinutes: service.durationMinutes,
    active: service.active,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  });
});

router.get(
  '/',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
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

    const userRole = req.user!.role as 'ADMIN' | 'BARBER' | 'CUSTOMER';
    const result = await listServices.execute(parseResult.data);

    if (userRole === 'CUSTOMER' || userRole === 'BARBER') {
      if (parseResult.data.activeOnly !== false) {
        result.data = result.data.filter(s => s.active);
      }
    }

    res.json({
      ...result,
      data: result.data.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price.toDecimal(),
        durationMinutes: s.durationMinutes,
        active: s.active,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    });
  }
);

router.get(
  '/:id',
  requireRole('ADMIN', 'BARBER', 'CUSTOMER'),
  async (req: AuthenticatedRequest, res) => {
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
      throw AppError.notFound('Service', parseResult.data.id);
    }

    const userRole = req.user!.role as 'ADMIN' | 'BARBER' | 'CUSTOMER';
    if ((userRole === 'CUSTOMER' || userRole === 'BARBER') && !service.active) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    res.json({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price.toDecimal(),
      durationMinutes: service.durationMinutes,
      active: service.active,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    });
  }
);

router.patch('/:id', requireRole('ADMIN'), async (req: AuthenticatedRequest, res) => {
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

  // Check if service exists
  const existingService = await servicesRepo.findById(paramsResult.data.id);
  if (!existingService) {
    throw AppError.notFound('Service', paramsResult.data.id);
  }

  const updateInput: {
    id: string;
    name?: string;
    description?: string;
    price?: Money;
    durationMinutes?: number;
    active?: boolean;
  } = {
    id: paramsResult.data.id,
    name: bodyResult.data.name,
    description: bodyResult.data.description,
    durationMinutes: bodyResult.data.durationMinutes,
    active: bodyResult.data.active,
  };
  if (bodyResult.data.price) {
    updateInput.price = toMoney(bodyResult.data.price);
  }

  const service = await updateService.execute(updateInput);

  res.json({
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.price.toDecimal(),
    durationMinutes: service.durationMinutes,
    active: service.active,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  });
});

export const servicesRouter = router;
