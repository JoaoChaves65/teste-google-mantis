/**
 * In-memory repository base used ONLY for unit testing application use cases.
 *
 * NOT part of production persistence. Production uses PostgreSQL via
 * infrastructure repositories (future stage).
 */

import { EntityNotFoundError } from '../../domain/errors';
import type { PaginationParams, PaginatedResponse } from '../../shared/pagination';
import { createPaginationMeta } from '../../shared/pagination';

export interface Identifiable {
  id: string;
  createdAt: Date;
}

export abstract class InMemoryRepository<T extends Identifiable> {
  protected readonly items = new Map<string, T>();

  protected store(item: T): T {
    this.items.set(item.id, item);
    return item;
  }

  protected replace(item: T): T {
    if (!this.items.has(item.id)) {
      throw new EntityNotFoundError(this.resourceName, item.id);
    }
    this.items.set(item.id, item);
    return item;
  }

  protected get(id: string): T | null {
    return this.items.get(id) ?? null;
  }

  protected list(params: PaginationParams): PaginatedResponse<T> {
    const sorted = [...this.items.values()].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const start = (params.page - 1) * params.limit;
    const data = sorted.slice(start, start + params.limit);
    return {
      data,
      meta: createPaginationMeta(params.page, params.limit, sorted.length),
    };
  }

  protected reset(): void {
    this.items.clear();
  }

  protected get resourceName(): string {
    return this.constructor.name.replace('InMemoryRepository', '').replace('Repository', '');
  }
}
