import { describe, it, expect } from 'vitest';
import { createCustomer, updateCustomer } from './customer';
import { InvalidDomainError } from './errors';

const baseInput = {
  name: 'Carlos Cliente',
  phone: '(11) 99999-1111',
};

describe('Customer domain', () => {
  it('creates a valid customer', () => {
    const customer = createCustomer(baseInput);
    expect(customer.name).toBe('Carlos Cliente');
    expect(customer.phone).toBe('(11) 99999-1111');
    expect(customer.userId).toBeNull();
    expect(customer.email).toBeNull();
  });

  it('can exist without a linked user (walk-in)', () => {
    const customer = createCustomer(baseInput);
    expect(customer.userId).toBeNull();
  });

  it('links a user when provided', () => {
    const customer = createCustomer({ ...baseInput, userId: 'user-1' });
    expect(customer.userId).toBe('user-1');
  });

  it('requires name', () => {
    expect(() => createCustomer({ ...baseInput, name: '' })).toThrow(InvalidDomainError);
  });

  it('requires phone', () => {
    expect(() => createCustomer({ ...baseInput, phone: '   ' })).toThrow(InvalidDomainError);
  });

  it('rejects invalid email', () => {
    expect(() => createCustomer({ ...baseInput, email: 'not-an-email' })).toThrow(
      InvalidDomainError
    );
  });

  it('normalizes email when provided', () => {
    const customer = createCustomer({ ...baseInput, email: '  CARLOS@BARBERLAB.local ' });
    expect(customer.email).toBe('carlos@barberlab.local');
  });

  it('rejects invalid birthDate', () => {
    expect(() => createCustomer({ ...baseInput, birthDate: new Date('nope') })).toThrow(
      InvalidDomainError
    );
  });

  it('updates fields', () => {
    const customer = createCustomer(baseInput);
    const updated = updateCustomer(customer, { name: 'Carlos Novo', phone: '(11) 98888-0000' });
    expect(updated.name).toBe('Carlos Novo');
    expect(updated.phone).toBe('(11) 98888-0000');
  });

  it('rejects update that empties phone', () => {
    const customer = createCustomer(baseInput);
    expect(() => updateCustomer(customer, { phone: '' })).toThrow(InvalidDomainError);
  });
});
