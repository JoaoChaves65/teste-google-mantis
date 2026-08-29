/**
 * In-memory UserRepository for unit tests.
 *
 * Exposes `create` as a test-only seeding helper (the UserRepository interface
 * does not require it because there is no CreateUser use case yet).
 */

import type { User } from '../../domain/user';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import type { UserRepository } from '../interfaces';
import { InMemoryRepository } from './base';

export class InMemoryUserRepository extends InMemoryRepository<User> implements UserRepository {
  async create(user: User): Promise<User> {
    return this.store(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.get(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.items.values()) {
      if (user.email === normalized) return user;
    }
    return null;
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<User>> {
    return this.list(params);
  }
}
