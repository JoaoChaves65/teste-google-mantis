/**
 * Customer domain entity.
 *
 * A customer may exist without a linked user (walk-in). When a user is linked,
 * the relationship is maintained by the application layer (referential check).
 */

import { randomUUID } from 'node:crypto';
import { InvalidDomainError } from './errors';
import { normalizeAndValidateEmail } from './email';
import type { User } from './user';

export interface Customer {
  id: string;
  userId: string | null;
  name: string;
  phone: string;
  email: string | null;
  birthDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface CreateCustomerInput {
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  birthDate?: Date;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  birthDate?: Date;
  notes?: string;
}

function assertValidCustomer(customer: {
  name: string;
  phone: string;
  email: string | null;
  birthDate: Date | null;
}): void {
  if (!customer.name || !customer.name.trim()) {
    throw new InvalidDomainError('name', 'name is required');
  }
  if (!customer.phone || !customer.phone.trim()) {
    throw new InvalidDomainError('phone', 'phone is required');
  }
  if (customer.email !== null) {
    normalizeAndValidateEmail(customer.email);
  }
  if (customer.birthDate !== null && Number.isNaN(customer.birthDate.getTime())) {
    throw new InvalidDomainError('birthDate', 'birthDate must be a valid date');
  }
}

export function createCustomer(input: CreateCustomerInput, now: Date = new Date()): Customer {
  const customer: Customer = {
    id: randomUUID(),
    userId: input.userId ?? null,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email:
      input.email !== undefined
        ? input.email
          ? normalizeAndValidateEmail(input.email)
          : null
        : null,
    birthDate: input.birthDate ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  assertValidCustomer(customer);
  return customer;
}

export function updateCustomer(
  customer: Customer,
  input: UpdateCustomerInput,
  now: Date = new Date()
): Customer {
  const next: Customer = {
    ...customer,
    name: input.name !== undefined ? input.name.trim() : customer.name,
    phone: input.phone !== undefined ? input.phone.trim() : customer.phone,
    email:
      input.email !== undefined
        ? input.email
          ? normalizeAndValidateEmail(input.email)
          : null
        : customer.email,
    birthDate: input.birthDate !== undefined ? input.birthDate : customer.birthDate,
    notes: input.notes !== undefined ? input.notes : customer.notes,
    updatedAt: now,
  };
  assertValidCustomer(next);
  return next;
}
