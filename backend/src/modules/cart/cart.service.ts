import { Injectable } from '@nestjs/common';
import { CartRepository } from './cart.repository.js';

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}
}
