/**
 * Money value object.
 *
 * Monetary values are stored as an integer number of cents to avoid floating
 * point issues. This is consistent with PostgreSQL NUMERIC(10,2): max value
 * 99,999,999.99 and precision of two decimal places.
 *
 * The domain never performs arithmetic on `number` for money.
 */

import { InvalidDomainError } from './errors';

const MAX_CENTS = 9_999_999_999; // 99,999,999.99
const DECIMAL_REGEX = /^-?\d+(\.\d{1,2})?$/;

export class Money {
  readonly cents: number;

  private constructor(cents: number) {
    this.cents = cents;
  }

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new InvalidDomainError('amount', 'Amount must be an integer number of cents');
    }
    if (Math.abs(cents) > MAX_CENTS) {
      throw new InvalidDomainError(
        'amount',
        `Amount exceeds supported range (±${(MAX_CENTS / 100).toFixed(2)})`
      );
    }
    return new Money(cents);
  }

  /**
   * Creates a Money from a decimal string (e.g. "50.00") or number.
   * Prefer the string form to avoid float precision surprises at the boundary.
   */
  static fromDecimal(value: string | number): Money {
    const str = typeof value === 'number' ? value.toFixed(2) : value;
    const normalized = str.trim();
    if (!DECIMAL_REGEX.test(normalized)) {
      throw new InvalidDomainError('amount', `Invalid decimal amount: "${value}"`);
    }

    const negative = normalized.startsWith('-');
    const abs = normalized.replace('-', '');
    const parts = abs.split('.');
    const whole = parts[0] ?? '0';
    const fraction = parts[1] ?? '00';
    const cents = parseInt(whole, 10) * 100 + parseInt(fraction.padEnd(2, '0'), 10);

    return Money.fromCents(negative ? -cents : cents);
  }

  isPositive(): boolean {
    return this.cents > 0;
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  toDecimal(): string {
    const negative = this.cents < 0;
    const abs = Math.abs(this.cents);
    const whole = Math.floor(abs / 100);
    const fraction = (abs % 100).toString().padStart(2, '0');
    return `${negative ? '-' : ''}${whole}.${fraction}`;
  }

  toString(): string {
    return this.toDecimal();
  }
}
