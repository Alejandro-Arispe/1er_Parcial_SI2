import { Injectable } from '@nestjs/common';
import { SalesRepository } from './sales.repository.js';

@Injectable()
export class SalesService {
  constructor(private readonly salesRepository: SalesRepository) {}
}
