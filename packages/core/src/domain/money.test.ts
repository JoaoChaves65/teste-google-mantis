import { describe, it, expect } from 'vitest';
import { Money } from './money';
import { InvalidDomainError } from './errors';

describe('Money', () => {
  describe('fromDecimal', () => {
    it('parses whole values', () => {
      expect(Money.fromDecimal('50').cents).toBe(5000);
    });

    it('parses decimal values', () => {
      expect(Money.fromDecimal('50.00').cents).toBe(5000);
      expect(Money.fromDecimal('12.5').cents).toBe(1250);
      expect(Money.fromDecimal('0.99').cents).toBe(99);
    });

    it('parses negative values', () => {
      expect(Money.fromDecimal('-5.50').cents).toBe(-550);
    });

    it('rejects invalid decimals', () => {
      expect(() => Money.fromDecimal('abc')).toThrow(InvalidDomainError);
      expect(() => Money.fromDecimal('1.234')).toThrow(InvalidDomainError);
      expect(() => Money.fromDecimal('')).toThrow(InvalidDomainError);
    });
  });

  describe('fromCents', () => {
    it('stores integer cents', () => {
      expect(Money.fromCents(1500).toDecimal()).toBe('15.00');
    });

    it('rejects non-integers', () => {
      expect(() => Money.fromCents(15.5)).toThrow(InvalidDomainError);
    });

    it('rejects values out of NUMERIC(10,2) range', () => {
      expect(() => Money.fromCents(10_000_000_000)).toThrow(InvalidDomainError);
    });
  });

  describe('comparison', () => {
    it('isPositive', () => {
      expect(Money.fromDecimal('0.01').isPositive()).toBe(true);
      expect(Money.fromDecimal('0.00').isPositive()).toBe(false);
      expect(Money.fromDecimal('-1.00').isPositive()).toBe(false);
    });

    it('equals', () => {
      expect(Money.fromDecimal('10.00').equals(Money.fromCents(1000))).toBe(true);
      expect(Money.fromDecimal('10.00').equals(Money.fromDecimal('10.01'))).toBe(false);
    });
  });

  it('formats to decimal string', () => {
    expect(Money.fromCents(1234).toString()).toBe('12.34');
    expect(Money.fromCents(5).toString()).toBe('0.05');
    expect(Money.fromCents(-99).toString()).toBe('-0.99');
  });
});
