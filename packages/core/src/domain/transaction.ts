/**
 * Transaction domain entity.
 *
 * INVARIANT: an EXPENSE must never reference an appointment. Only INCOME may
 * carry an appointmentId.
 */

import { randomUUID } from 'node:crypto';
import { InvalidDomainError, InvalidTransactionTypeError } from './errors';
import type { Money } from './money';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export const TRANSACTION_TYPES: readonly TransactionType[] = Object.values(TransactionType);

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  amount: Money;
  description: string | null;
  date: Date;
  appointmentId: string | null;
  barberId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionInput {
  type: TransactionType;
  category: string;
  amount: Money;
  description?: string;
  date: Date;
  appointmentId?: string;
  barberId?: string;
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  category?: string;
  amount?: Money;
  description?: string;
  date?: Date;
  appointmentId?: string;
  barberId?: string;
}

export function assertTransactionConsistency(transaction: {
  type: TransactionType;
  appointmentId: string | null;
  category: string;
  amount: Money;
  date: Date;
}): void {
  if (!TRANSACTION_TYPES.includes(transaction.type)) {
    throw new InvalidDomainError('type', `type must be one of: ${TRANSACTION_TYPES.join(', ')}`);
  }
  if (!transaction.category || !transaction.category.trim()) {
    throw new InvalidDomainError('category', 'category is required');
  }
  if (!transaction.amount.isPositive()) {
    throw new InvalidDomainError('amount', 'amount must be greater than zero');
  }
  if (Number.isNaN(transaction.date.getTime())) {
    throw new InvalidDomainError('date', 'date must be a valid date');
  }
  if (transaction.type === TransactionType.EXPENSE && transaction.appointmentId !== null) {
    throw new InvalidTransactionTypeError(
      TransactionType.EXPENSE,
      'EXPENSE transaction cannot reference an appointment'
    );
  }
}

export function createTransaction(
  input: CreateTransactionInput,
  now: Date = new Date()
): Transaction {
  const transaction: Transaction = {
    id: randomUUID(),
    type: input.type,
    category: input.category.trim(),
    amount: input.amount,
    description: input.description?.trim() || null,
    date: input.date,
    appointmentId: input.appointmentId ?? null,
    barberId: input.barberId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  assertTransactionConsistency(transaction);
  return transaction;
}

export function updateTransaction(
  transaction: Transaction,
  input: UpdateTransactionInput,
  now: Date = new Date()
): Transaction {
  const next: Transaction = {
    ...transaction,
    type: input.type !== undefined ? input.type : transaction.type,
    category: input.category !== undefined ? input.category.trim() : transaction.category,
    amount: input.amount !== undefined ? input.amount : transaction.amount,
    description:
      input.description !== undefined
        ? input.description
          ? input.description.trim()
          : null
        : transaction.description,
    date: input.date !== undefined ? input.date : transaction.date,
    appointmentId:
      input.appointmentId !== undefined ? input.appointmentId || null : transaction.appointmentId,
    barberId: input.barberId !== undefined ? input.barberId || null : transaction.barberId,
    updatedAt: now,
  };
  assertTransactionConsistency(next);
  return next;
}
