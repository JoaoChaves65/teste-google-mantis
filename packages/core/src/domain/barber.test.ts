import { describe, it, expect } from 'vitest';
import { createBarber, updateBarber, isBarberActive } from './barber';
import { InvalidDomainError } from './errors';

const baseInput = {
  name: 'João Barbeiro',
};

describe('Barber domain', () => {
  it('creates a valid barber, active by default', () => {
    const barber = createBarber(baseInput);
    expect(barber.name).toBe('João Barbeiro');
    expect(barber.active).toBe(true);
    expect(isBarberActive(barber)).toBe(true);
  });

  it('phone is optional', () => {
    const barber = createBarber(baseInput);
    expect(barber.phone).toBeNull();
  });

  it('accepts optional specialty and phone', () => {
    const barber = createBarber({ ...baseInput, phone: '(11) 98888-1111', specialty: 'Barba' });
    expect(barber.phone).toBe('(11) 98888-1111');
    expect(barber.specialty).toBe('Barba');
  });

  it('requires name', () => {
    expect(() => createBarber({ name: '  ' })).toThrow(InvalidDomainError);
  });

  it('can be set inactive', () => {
    const barber = createBarber(baseInput);
    const updated = updateBarber(barber, { active: false });
    expect(updated.active).toBe(false);
    expect(isBarberActive(updated)).toBe(false);
  });

  it('active is a boolean', () => {
    const barber = createBarber(baseInput);
    const updated = updateBarber(barber, { active: true });
    expect(typeof updated.active).toBe('boolean');
  });

  it('rejects invalid hireDate', () => {
    expect(() => createBarber({ ...baseInput, hireDate: new Date('nope') })).toThrow(
      InvalidDomainError
    );
  });
});
