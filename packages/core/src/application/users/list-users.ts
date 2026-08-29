import type { User } from '../../domain/user';
import type { UserRepository } from '../../persistence/interfaces';
import type { PaginatedQuery } from '../interfaces';
import { validatePagination } from '../../shared/pagination';
import type { PaginatedResponse } from '../../shared/pagination';
import type { ListInput } from '../types';

export class ListUsers implements PaginatedQuery<ListInput, User> {
  constructor(private readonly users: UserRepository) {}

  async execute(input: ListInput): Promise<PaginatedResponse<User>> {
    return this.users.findAll(validatePagination(input));
  }
}
