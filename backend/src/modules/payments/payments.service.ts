import { Injectable } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly paymentGatewayService: PaymentGatewayService) {}
}
