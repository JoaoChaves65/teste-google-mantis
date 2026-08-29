import { describe, it, expect, beforeEach } from 'vitest';
import { CreateTransaction } from './create-transaction';
import { UpdateTransaction } from './update-transaction';
import { GetTransaction } from './get-transaction';
import { ListTransactions } from './list-transactions';
import { TransactionType } from '../../domain/transaction';
import { Money } from '../../domain/money';
import { EntityNotFoundError, InvalidTransactionTypeError } from '../../domain/errors';
import { InMemoryTransactionRepository } from '../../persistence/in-memory/transaction-repository';

const incomeInput = {
  type: TransactionType.INCOME,
  category: 'Corte',
  amount: Money.fromDecimal('50.00'),
  date: new Date('2026-08-01'),
};

describe('Transaction use cases', () => {
  let transactions: InMemoryTransactionRepository;

  beforeEach(() => {
    transactions = new InMemoryTransactionRepository();
  });

  describe('CreateTransaction', () => {
    it('creates an INCOME transaction', async () => {
      const useCase = new CreateTransaction(transactions);
      const created = await useCase.execute(incomeInput);
      expect(created.type).toBe(TransactionType.INCOME);
      expect(created.amount.toDecimal()).toBe('50.00');
    });

    it('creates an EXPENSE transaction', async () => {
      const useCase = new CreateTransaction(transactions);
      const created = await useCase.execute({
        ...incomeInput,
        type: TransactionType.EXPENSE,
        category: 'Aluguel',
        amount: Money.fromDecimal('2000.00'),
      });
      expect(created.type).toBe(TransactionType.EXPENSE);
    });

    it('rejects EXPENSE with appointment', async () => {
      const useCase = new CreateTransaction(transactions);
      await expect(
        useCase.execute({ ...incomeInput, type: TransactionType.EXPENSE, appointmentId: 'appt-1' })
      ).rejects.toThrow(InvalidTransactionTypeError);
    });
  });

  describe('UpdateTransaction', () => {
    it('updates category', async () => {
      const created = await new CreateTransaction(transactions).execute(incomeInput);
      const useCase = new UpdateTransaction(transactions);
      const updated = await useCase.execute({ id: created.id, category: 'Barba' });
      expect(updated.category).toBe('Barba');
    });

    it('rejects making an INCOME-with-appointment an EXPENSE', async () => {
      const created = await new CreateTransaction(transactions).execute({
        ...incomeInput,
        appointmentId: 'appt-1',
      });
      const useCase = new UpdateTransaction(transactions);
      await expect(
        useCase.execute({ id: created.id, type: TransactionType.EXPENSE })
      ).rejects.toThrow(InvalidTransactionTypeError);
    });

    it('throws when transaction does not exist', async () => {
      const useCase = new UpdateTransaction(transactions);
      await expect(useCase.execute({ id: 'missing', category: 'X' })).rejects.toThrow(
        EntityNotFoundError
      );
    });
  });

  describe('GetTransaction', () => {
    it('gets an existing transaction', async () => {
      const created = await new CreateTransaction(transactions).execute(incomeInput);
      const useCase = new GetTransaction(transactions);
      expect((await useCase.execute({ id: created.id }))?.id).toBe(created.id);
    });

    it('returns null when not found', async () => {
      const useCase = new GetTransaction(transactions);
      expect(await useCase.execute({ id: 'missing' })).toBeNull();
    });
  });

  describe('ListTransactions', () => {
    it('lists transactions with pagination', async () => {
      const create = new CreateTransaction(transactions);
      await create.execute(incomeInput);
      await create.execute({
        ...incomeInput,
        category: 'Barba',
        amount: Money.fromDecimal('30.00'),
      });

      const useCase = new ListTransactions(transactions);
      const result = await useCase.execute({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });
});
