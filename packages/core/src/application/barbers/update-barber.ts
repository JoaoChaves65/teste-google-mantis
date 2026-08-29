import { updateBarber, type Barber, type UpdateBarberInput } from '../../domain/barber';
import { EntityNotFoundError } from '../../domain/errors';
import type { BarberRepository } from '../../persistence/interfaces';
import type { Command } from '../interfaces';

export interface UpdateBarberCommandInput extends UpdateBarberInput {
  id: string;
}

export class UpdateBarber implements Command<UpdateBarberCommandInput, Barber> {
  constructor(private readonly barbers: BarberRepository) {}

  async execute(input: UpdateBarberCommandInput): Promise<Barber> {
    const existing = await this.barbers.findById(input.id);
    if (!existing) {
      throw new EntityNotFoundError('Barber', input.id);
    }
    const updated = updateBarber(existing, input);
    return this.barbers.update(updated);
  }
}
