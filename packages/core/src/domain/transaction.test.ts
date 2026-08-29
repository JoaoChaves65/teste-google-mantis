import { describe, it, expect } from 'vitest';
import {
  createTransaction,
  updateTransaction,
  assertTransactionConsistency,
  TransactionType,
} from './transaction';
import { Money } from './money';
import { InvalidDomainError, InvalidTransactionTypeError } from './errors';

const incomeInput = {
  type: TransactionType.INCOME,
  category: 'Corte',
  amount: Money.fromDecimal('50.00'),
  date: new Date('2026-08-01'),
};

const expenseInput = {
  type: TransactionType.EXPENSE,
  category: 'Aluguel',
  amount: Money.fromDecimal('2000.00'),
  date: new Date('2026-08-01'),
};

describe('Transaction domain', () => {
  it('creates a valid INCOME', () => {
    const t = createTransaction(incomeInput);
    expect(t.type).toBe(TransactionType.INCOME);
    expect(t.amount.toDecimal()).toBe('50.00');
    expect(t.appointmentId).toBeNull();
  });

  it('creates a valid EXPENSE', () => {
    const t = createTransaction(expenseInput);
    expect(t.type).toBe(TransactionType.EXPENSE);
    expect(t.amount.toDecimal()).toBe('2000.00');
  });

  describe('amount', () => {
    it('rejects zero amount', () => {
      expect(() =>
        createTransaction({ ...incomeInput, amount: Money.fromDecimal('0.00') })
      ).toThrow(InvalidDomainError);
    });

    it('rejects negative amount', () => {
      expect(() =>
        createTransaction({ ...incomeInput, amount: Money.fromDecimal('-5.00') })
      ).toThrow(InvalidDomainError);
    });
  });

  describe('type consistency', () => {
    it('allows INCOME with appointmentId', () => {
      const t = createTransaction({ ...incomeInput, appointmentId: 'appointment-1' });
      expect(t.appointmentId).toBe('appointment-1');
    });

    it('allows INCOME without appointmentId', () => {
      const t = createTransaction(incomeInput);
      expect(t.appointmentId).toBeNull();
    });

    it('rejects EXPENSE with appointmentId', () => {
      expect(() => createTransaction({ ...expenseInput, appointmentId: 'appointment-1' })).toThrow(
        InvalidTransactionTypeError
      );
    });

    it('allows EXPENSE without appointment', () => {
      const t = createTransaction(expenseInput);
      expect(t.appointmentId).toBeNull();
    });
  });

  it('barberId is optional for both types', () => {
    expect(createTransaction({ ...incomeInput, barberId: 'barber-1' }).barberId).toBe('barber-1');
    expect(createTransaction(expenseInput).barberId).toBeNull();
  });

  it('requires category', () => {
    expect(() => createTransaction({ ...incomeInput, category: ' ' })).toThrow(InvalidDomainError);
  });

  it('rejects invalid date', () => {
    expect(() => createTransaction({ ...incomeInput, date: new Date('nope') })).toThrow(
      InvalidDomainError
    );
  });

  it('rejects invalid type', () => {
    expect(() =>
      assertTransactionConsistency({
        type: 'REFUND' as TransactionType,
        category: 'X',
        amount: Money.fromDecimal('1.00'),
        date: new Date(),
        appointmentId: null,
      })
    ).toThrow(InvalidDomainError);
  });

  describe('update', () => {
    it('rejects changing an EXPENSE to reference an appointment', () => {
      const t = createTransaction(expenseInput);
      expect(() => updateTransaction(t, { appointmentId: 'appointment-1' })).toThrow(
        InvalidTransactionTypeError
      );
    });

    it('rejects changing type to EXPENSE while keeping an appointment', () => {
      const t = createTransaction({ ...incomeInput, appointmentId: 'appointment-1' });
      expect(() => updateTransaction(t, { type: TransactionType.EXPENSE })).toThrow(
        InvalidTransactionTypeError
      );
    });

    it('allows clearing appointmentId from INCOME', () => {
      const t = createTransaction({ ...incomeInput, appointmentId: 'appointment-1' });
      const updated = updateTransaction(t, { appointmentId: '' });
      expect(updated.appointmentId).toBeNull();
    });
  });
});
