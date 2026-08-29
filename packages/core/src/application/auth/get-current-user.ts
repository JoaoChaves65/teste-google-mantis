import { EntityNotFoundError, AccountInactiveError } from '../../domain/errors';
import { UserStatus } from '../../domain/user';
import type { User } from '../../domain/user';
import type { UserRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';

export interface GetCurrentUserQueryInput {
  userId: string;
}

export class GetCurrentUserQuery implements Query<GetCurrentUserQueryInput, User> {
  constructor(private readonly users: UserRepository) {}

  async execute(input: GetCurrentUserQueryInput): Promise<User> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new EntityNotFoundError('User', input.userId);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new AccountInactiveError();
    }

    return user;
  }
}
