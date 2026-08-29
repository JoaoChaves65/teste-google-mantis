/**
 * Barber domain entity.
 */

import { randomUUID } from 'node:crypto';
import { InvalidDomainError } from './errors';
import type { User } from './user';

export interface Barber {
  id: string;
  userId: string | null;
  name: string;
  phone: string | null;
  specialty: string | null;
  hireDate: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface CreateBarberInput {
  userId?: string;
  name: string;
  phone?: string;
  specialty?: string;
  hireDate?: Date;
}

export interface UpdateBarberInput {
  name?: string;
  phone?: string;
  specialty?: string;
  active?: boolean;
}

export function createBarber(input: CreateBarberInput, now: Date = new Date()): Barber {
  if (!input.name || !input.name.trim()) {
    throw new InvalidDomainError('name', 'name is required');
  }
  if (input.hireDate !== undefined && Number.isNaN(input.hireDate.getTime())) {
    throw new InvalidDomainError('hireDate', 'hireDate must be a valid date');
  }

  return {
    id: randomUUID(),
    userId: input.userId ?? null,
    name: input.name.trim(),
    phone: input.phone?.trim() ?? null,
    specialty: input.specialty?.trim() || null,
    hireDate: input.hireDate ?? now,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBarber(
  barber: Barber,
  input: UpdateBarberInput,
  now: Date = new Date()
): Barber {
  const name = input.name !== undefined ? input.name : barber.name;
  if (!name || !name.trim()) {
    throw new InvalidDomainError('name', 'name is required');
  }

  return {
    ...barber,
    name: name.trim(),
    phone: input.phone !== undefined ? (input.phone ? input.phone.trim() : null) : barber.phone,
    specialty:
      input.specialty !== undefined
        ? input.specialty
          ? input.specialty.trim()
          : null
        : barber.specialty,
    active: input.active !== undefined ? input.active : barber.active,
    updatedAt: now,
  };
}

export function isBarberActive(barber: Pick<Barber, 'active'>): boolean {
  return barber.active;
}
