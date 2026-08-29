import { Router } from 'express';
import { z } from 'zod';
import { createSqlExecutor } from '@barberlab/core/infrastructure';
import { PgTransactionRepository } from '@barberlab/core/infrastructure';
import {
  CreateTransaction,
  GetTransaction,
  ListTransactions,
  UpdateTransaction,
} from '@barberlab/core/application';
import { vulnerableAuthMiddleware } from '../../http/middleware/vulnerableAuth';
import { Money } from '@barberlab/core';
import type { TransactionType } from '@barberlab/core';

const router = Router();

const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  category: z.string().min(1).max(100),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  description: z.string().max(500).optional(),
  date: z.string().datetime(),
  appointmentId: z.string().uuid().optional(),
  barberId: z.string().uuid().optional(),
});

const updateTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().min(1).max(100).optional(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  description: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
  appointmentId: z.string().uuid().optional(),
  barberId: z.string().uuid().optional(),
});

const listTransactionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(vulnerableAuthMiddleware);

router.get('/', async (req, res) => {
  const parseResult = listTransactionsSchema.safeParse(req.query);
  if (!parseResult.success) {
    res
      .status(400)
      .json({ error: 'Invalid query parameters', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const transactionsRepo = new PgTransactionRepository(executor);
  const listTransactions = new ListTransactions(transactionsRepo);

  const result = await listTransactions.execute(parseResult.data);
  // VULNERÁVEL: Não verifica role ADMIN - qualquer usuário autenticado pode acessar
  res.json(result);
});

router.get('/:id', async (req, res) => {
  const parseResult = idParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid transaction ID', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const transactionsRepo = new PgTransactionRepository(executor);
  const getTransaction = new GetTransaction(transactionsRepo);

  const transaction = await getTransaction.execute({ id: parseResult.data.id });
  if (!transaction) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }

  res.json({
    id: transaction.id,
    type: transaction.type,
    category: transaction.category,
    amount: transaction.amount,
    description: transaction.description,
    date: transaction.date,
    appointmentId: transaction.appointmentId,
    barberId: transaction.barberId,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  });
});

router.post('/', async (req, res) => {
  const parseResult = createTransactionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const transactionsRepo = new PgTransactionRepository(executor);
  const createTransaction = new CreateTransaction(transactionsRepo);

  const transaction = await createTransaction.execute({
    ...parseResult.data,
    type: parseResult.data.type as TransactionType,
    amount: Money.fromDecimal(parseResult.data.amount),
    date: new Date(parseResult.data.date),
    appointmentId: parseResult.data.appointmentId ?? undefined,
    barberId: parseResult.data.barberId ?? undefined,
  });
  res.status(201).json({
    id: transaction.id,
    type: transaction.type,
    category: transaction.category,
    amount: transaction.amount,
    description: transaction.description,
    date: transaction.date,
    appointmentId: transaction.appointmentId,
    barberId: transaction.barberId,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  });
});

router.patch('/:id', async (req, res) => {
  const paramsResult = idParamSchema.safeParse(req.params);
  if (!paramsResult.success) {
    res
      .status(400)
      .json({ error: 'Invalid transaction ID', details: paramsResult.error.flatten() });
    return;
  }

  const bodyResult = updateTransactionSchema.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: bodyResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const transactionsRepo = new PgTransactionRepository(executor);
  const updateTransaction = new UpdateTransaction(transactionsRepo);

  const transaction = await updateTransaction.execute({
    id: paramsResult.data.id,
    ...bodyResult.data,
    type: bodyResult.data.type as TransactionType | undefined,
    date: bodyResult.data.date ? new Date(bodyResult.data.date) : undefined,
    amount: bodyResult.data.amount ? Money.fromDecimal(bodyResult.data.amount) : undefined,
    appointmentId: bodyResult.data.appointmentId ?? undefined,
    barberId: bodyResult.data.barberId ?? undefined,
  });
  res.json({
    id: transaction.id,
    type: transaction.type,
    category: transaction.category,
    amount: transaction.amount,
    description: transaction.description,
    date: transaction.date,
    appointmentId: transaction.appointmentId,
    barberId: transaction.barberId,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  });
});

export const transactionsRouter = router;
