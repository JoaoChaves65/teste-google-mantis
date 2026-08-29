import type { Barber } from '../../domain/barber';
import type { BarberRepository } from '../../persistence/interfaces';
import type { Query } from '../interfaces';
import type { IdInput } from '../types';

export class GetBarber implements Query<IdInput, Barber | null> {
  constructor(private readonly barbers: BarberRepository) {}

  async execute(input: IdInput): Promise<Barber | null> {
    return this.barbers.findById(input.id);
  }
}
