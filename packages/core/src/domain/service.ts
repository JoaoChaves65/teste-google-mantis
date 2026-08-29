/**
 * Service domain entity.
 *
 * Price is a Money value object (integer cents) to avoid floating point issues.
 */

import { randomUUID } from 'node:crypto';
import { InvalidDomainError } from './errors';
import type { Money } from './money';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: Money;
  durationMinutes: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateServiceInput {
  name: string;
  description?: string;
  price: Money;
  durationMinutes: number;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  price?: Money;
  durationMinutes?: number;
  active?: boolean;
}

export function createService(input: CreateServiceInput, now: Date = new Date()): Service {
  if (!input.name || !input.name.trim()) {
    throw new InvalidDomainError('name', 'name is required');
  }
  if (!input.price.isPositive()) {
    throw new InvalidDomainError('price', 'price must be greater than zero');
  }
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new InvalidDomainError('durationMinutes', 'durationMinutes must be a positive integer');
  }

  return {
    id: randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: input.price,
    durationMinutes: input.durationMinutes,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateService(
  service: Service,
  input: UpdateServiceInput,
  now: Date = new Date()
): Service {
  const name = input.name !== undefined ? input.name : service.name;
  if (!name || !name.trim()) {
    throw new InvalidDomainError('name', 'name is required');
  }
  const price = input.price !== undefined ? input.price : service.price;
  if (!price.isPositive()) {
    throw new InvalidDomainError('price', 'price must be greater than zero');
  }
  const durationMinutes =
    input.durationMinutes !== undefined ? input.durationMinutes : service.durationMinutes;
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new InvalidDomainError('durationMinutes', 'durationMinutes must be a positive integer');
  }

  return {
    ...service,
    name: name.trim(),
    description:
      input.description !== undefined
        ? input.description
          ? input.description.trim()
          : null
        : service.description,
    price,
    durationMinutes,
    active: input.active !== undefined ? input.active : service.active,
    updatedAt: now,
  };
}

export function isServiceActive(service: Pick<Service, 'active'>): boolean {
  return service.active;
}
