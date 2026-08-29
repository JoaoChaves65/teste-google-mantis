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
import { authMiddleware } from '../../http/middleware/auth';
import { requireAdmin } from '../../http/middleware/rbac';
import type { AuthenticatedRequest } from '../../http/middleware/auth';
import { AppError } from '@barberlab/core';
import { Money, TransactionType, InvalidTransactionTypeError } from '@barberlab/core/domain';

const router = Router();

const priceSchema = z.string().regex(/^\d+(\.\d{1,2})?$/);

const createTransactionSchema = z.object({
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]),
  category: z.string().min(1).max(100),
  amount: priceSchema,
  description: z.string().max(500).optional(),
  date: z.string().datetime(),
  appointmentId: z.string().uuid().optional(),
  barberId: z.string().uuid().optional(),
});

const updateTransactionSchema = z.object({
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]).optional(),
  category: z.string().min(1).max(100).optional(),
  amount: priceSchema.optional(),
  description: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
  appointmentId: z.string().uuid().optional(),
  barberId: z.string().uuid().optional(),
});

const listTransactionsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE]).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

function toMoney(priceStr: string): Money {
  return Money.fromDecimal(priceStr);
}

router.use(authMiddleware);
router.use(requireAdmin);

router.post('/', async (req: AuthenticatedRequest, res) => {
  const parseResult = createTransactionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request body', details: parseResult.error.flatten() });
    return;
  }

  const executor = createSqlExecutor();
  const transactionsRepo = new PgTransactionRepository(executor);
  const createTransaction = new CreateTransaction(transactionsRepo);

  try {
    const transaction = await createTransaction.execute({
      ...parseResult.data,
      amount: toMoney(parseResult.data.amount),
      date: new Date(parseResult.data.date),
    });

    res.status(201).json({
      id: transaction.id,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toDecimal(),
      description: transaction.description,
      date: transaction.date,
      appointmentId: transaction.appointmentId,
      barberId: transaction.barberId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });
  } catch (error) {
    if (error instanceof InvalidTransactionTypeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

router.get('/', async (req: AuthenticatedRequest, res) => {
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

  if (parseResult.data.type) {
    result.data = result.data.filter(t => t.type === parseResult.data.type);
  }

  res.json({
    ...result,
    data: result.data.map(t => ({
      id: t.id,
      type: t.type,
      category: t.category,
      amount: t.amount.toDecimal(),
      description: t.description,
      date: t.date,
      appointmentId: t.appointmentId,
      barberId: t.barberId,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  });
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
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
    throw AppError.notFound('Transaction', parseResult.data.id);
  }

  res.json({
    id: transaction.id,
    type: transaction.type,
    category: transaction.category,
    amount: transaction.amount.toDecimal(),
    description: transaction.description,
    date: transaction.date,
    appointmentId: transaction.appointmentId,
    barberId: transaction.barberId,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  });
});

router.patch('/:id', async (req: AuthenticatedRequest, res) => {
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

  const updateInput: {
    id: string;
    type?: TransactionType;
    category?: string;
    amount?: Money;
    description?: string;
    date?: Date;
    appointmentId?: string;
    barberId?: string;
  } = {
    id: paramsResult.data.id,
    type: bodyResult.data.type,
    category: bodyResult.data.category,
    description: bodyResult.data.description,
    date: bodyResult.data.date ? new Date(bodyResult.data.date) : undefined,
    appointmentId: bodyResult.data.appointmentId,
    barberId: bodyResult.data.barberId,
  };
  if (bodyResult.data.amount) {
    updateInput.amount = toMoney(bodyResult.data.amount);
  }

  try {
    const transaction = await updateTransaction.execute(updateInput);

    res.json({
      id: transaction.id,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount.toDecimal(),
      description: transaction.description,
      date: transaction.date,
      appointmentId: transaction.appointmentId,
      barberId: transaction.barberId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'EntityNotFoundError') {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    throw error;
  }
});

export const transactionsRouter = router;
