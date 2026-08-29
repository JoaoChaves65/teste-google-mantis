import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import { PgUserRepository } from '@barberlab/core/infrastructure';
import { ListUsers } from '@barberlab/core/application';
import { createUser } from '@barberlab/core';
import type { UserRole } from '@barberlab/core';
import { vulnerableAuthMiddleware } from '../../http/middleware/vulnerableAuth';
import { createPasswordHasher } from '@barberlab/core/shared';

const router = Router();

const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'BARBER', 'CUSTOMER']).default('CUSTOMER'),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(vulnerableAuthMiddleware);

router.get('/', async (req, res) => {
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

  // VULNERÁVEL: Expõe passwordHash na listagem
  // VULNERÁVEL: Não filtra campos sensíveis
  // VULNERÁVEL: Não verifica role ADMIN - qualquer usuário autenticado pode acessar
  res.json({
    ...result,
    data: result.data.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      // VULNERÁVEL: Expõe passwordHash
      passwordHash: user.passwordHash,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  });
});

router.post('/', async (req, res) => {
  const parseResult = createUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
    return;
  }

  // VULNERÁVEL: Qualquer usuário autenticado pode criar usuários (incluindo ADMIN)
  // VULNERÁVEL: Não verifica se o usuário tem permissão para criar usuários
  // VULNERÁVEL: Permite definir role via mass assignment
  const executor = createSqlExecutor();
  const usersRepo = new PgUserRepository(executor);
  const passwordHasher = createPasswordHasher();
  const passwordHash = await passwordHasher.hash(parseResult.data.password);

  const user = createUser({
    name: parseResult.data.name,
    email: parseResult.data.email,
    passwordHash,
    role: parseResult.data.role as UserRole,
  });
  await usersRepo.create(user);
  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

router.get('/:id', async (req, res) => {
  const parseResult = idParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid user ID', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const usersRepo = new PgUserRepository(executor);

  const user = await usersRepo.findById(parseResult.data.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // VULNERÁVEL: Expõe passwordHash
  // VULNERÁVEL: Não verifica se o usuário está acessando seu próprio recurso
  // VULNERÁVEL: IDOR - qualquer usuário pode acessar qualquer outro usuário
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    // VULNERÁVEL: Expõe passwordHash
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

export const usersRouter = router;
