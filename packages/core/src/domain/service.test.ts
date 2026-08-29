import { describe, it, expect } from 'vitest';
import { createService, updateService, isServiceActive } from './service';
import { Money } from './money';
import { InvalidDomainError } from './errors';

const baseInput = {
  name: 'Corte Masculino Clássico',
  price: Money.fromDecimal('50.00'),
  durationMinutes: 45,
};

describe('Service domain', () => {
  it('creates a valid active service with Money price', () => {
    const service = createService(baseInput);
    expect(service.name).toBe('Corte Masculino Clássico');
    expect(service.price.toDecimal()).toBe('50.00');
    expect(service.durationMinutes).toBe(45);
    expect(service.active).toBe(true);
    expect(isServiceActive(service)).toBe(true);
  });

  describe('price', () => {
    it('accepts positive price', () => {
      expect(
        createService({ ...baseInput, price: Money.fromDecimal('0.01') }).price.isPositive()
      ).toBe(true);
    });

    it('rejects zero price', () => {
      expect(() => createService({ ...baseInput, price: Money.fromDecimal('0.00') })).toThrow(
        InvalidDomainError
      );
    });

    it('rejects negative price', () => {
      expect(() => createService({ ...baseInput, price: Money.fromDecimal('-1.00') })).toThrow(
        InvalidDomainError
      );
    });
  });

  describe('durationMinutes', () => {
    it('accepts positive duration', () => {
      const service = createService({ ...baseInput, durationMinutes: 30 });
      expect(service.durationMinutes).toBe(30);
    });

    it('rejects zero duration', () => {
      expect(() => createService({ ...baseInput, durationMinutes: 0 })).toThrow(InvalidDomainError);
    });

    it('rejects negative duration', () => {
      expect(() => createService({ ...baseInput, durationMinutes: -15 })).toThrow(
        InvalidDomainError
      );
    });

    it('rejects non-integer duration', () => {
      expect(() => createService({ ...baseInput, durationMinutes: 45.5 })).toThrow(
        InvalidDomainError
      );
    });
  });

  it('requires name', () => {
    expect(() => createService({ ...baseInput, name: ' ' })).toThrow(InvalidDomainError);
  });

  it('updates service and can deactivate', () => {
    const service = createService(baseInput);
    const updated = updateService(service, { active: false, price: Money.fromDecimal('55.00') });
    expect(updated.active).toBe(false);
    expect(isServiceActive(updated)).toBe(false);
    expect(updated.price.toDecimal()).toBe('55.00');
  });

  it('rejects update to zero price', () => {
    const service = createService(baseInput);
    expect(() => updateService(service, { price: Money.fromDecimal('0') })).toThrow(
      InvalidDomainError
    );
  });
});
