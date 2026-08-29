import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import { PgUserRepository } from '@barberlab/core/infrastructure';
import { GetUser, ListUsers } from '@barberlab/core/application';
import { authMiddleware } from '../../http/middleware/auth';
import { requireAdmin } from '../../http/middleware/rbac';
import type { AuthenticatedRequest } from '../../http/middleware/auth';
import { AppError } from '@barberlab/core';

const router = Router();

const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', async (req: AuthenticatedRequest, res) => {
  const parseResult = listUsersSchema.safeParse(req.query);
  if (!parseResult.success) {
    res
      .status(400)
      .json({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const usersRepo = new PgUserRepository(executor);
  const listUsers = new ListUsers(usersRepo);

  const result = await listUsers.execute(parseResult.data);
  res.json({
    ...result,
    data: result.data.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
  });
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const parseResult = idParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid user ID', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const usersRepo = new PgUserRepository(executor);
  const getUser = new GetUser(usersRepo);

  const user = await getUser.execute({ id: parseResult.data.id });
  if (!user) {
    throw AppError.notFound('User', parseResult.data.id);
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

export const usersRouter = router;
