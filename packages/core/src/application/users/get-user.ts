import type { User } from '../../domain/user';
import type { UserRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import type { IdInput } from '../types';

export class GetUser implements Query<IdInput, User | null> {
  constructor(private readonly users: UserRepository) {}

  async execute(input: IdInput): Promise<User | null> {
    return this.users.findById(input.id);
  }
}
