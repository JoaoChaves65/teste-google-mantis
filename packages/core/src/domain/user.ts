/**
 * User domain entity.
 *
 * Note: password hashing is intentionally NOT part of this entity. The
 * `passwordHash` field is set by the authentication layer (future stage).
 */

import { randomUUID } from 'node:crypto';
import { InvalidDomainError } from './errors';
import { normalizeAndValidateEmail } from './email';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  BARBER = 'BARBER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export const USER_ROLES: readonly UserRole[] = Object.values(UserRole);
export const USER_STATUSES: readonly UserStatus[] = Object.values(UserStatus);

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

export function createUser(input: CreateUserInput, now: Date = new Date()): User {
  if (!input.name || !input.name.trim()) {
    throw new InvalidDomainError('name', 'name is required');
  }
  if (!input.passwordHash) {
    throw new InvalidDomainError('passwordHash', 'passwordHash is required');
  }
  if (!USER_ROLES.includes(input.role)) {
    throw new InvalidDomainError('role', `role must be one of: ${USER_ROLES.join(', ')}`);
  }
  const email = normalizeAndValidateEmail(input.email);

  return {
    id: randomUUID(),
    name: input.name.trim(),
    email,
    passwordHash: input.passwordHash,
    role: input.role,
    status: UserStatus.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateUser(user: User, input: UpdateUserInput, now: Date = new Date()): User {
  const name = input.name !== undefined ? input.name : user.name;
  if (!name || !name.trim()) {
    throw new InvalidDomainError('name', 'name is required');
  }
  const email = input.email !== undefined ? normalizeAndValidateEmail(input.email) : user.email;
  const role = input.role !== undefined ? input.role : user.role;
  if (!USER_ROLES.includes(role)) {
    throw new InvalidDomainError('role', `role must be one of: ${USER_ROLES.join(', ')}`);
  }
  const status = input.status !== undefined ? input.status : user.status;
  if (!USER_STATUSES.includes(status)) {
    throw new InvalidDomainError('status', `status must be one of: ${USER_STATUSES.join(', ')}`);
  }

  return {
    ...user,
    name: name.trim(),
    email,
    role,
    status,
    updatedAt: now,
  };
}

export function isUserActive(user: Pick<User, 'status'>): boolean {
  return user.status === UserStatus.ACTIVE;
}
