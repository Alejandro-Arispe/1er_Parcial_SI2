import { Injectable } from '@nestjs/common';
import { ReservationsRepository } from './reservations.repository.js';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
  ) {}
}
