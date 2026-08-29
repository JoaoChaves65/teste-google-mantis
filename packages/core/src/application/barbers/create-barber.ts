import { createBarber, type Barber, type CreateBarberInput } from '../../domain/barber';
import { EntityNotFoundError } from '../../domain/errors';
import type { BarberRepository, UserRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export class CreateBarber implements Command<CreateBarberInput, Barber> {
  constructor(
    private readonly barbers: BarberRepository,
    private readonly users: UserRepository
  ) {}

  async execute(input: CreateBarberInput): Promise<Barber> {
    if (input.userId) {
      const user = await this.users.findById(input.userId);
      if (!user) {
        throw new EntityNotFoundError('User', input.userId);
      }
    }
    const barber = createBarber(input);
    return this.barbers.create(barber);
  }
}
