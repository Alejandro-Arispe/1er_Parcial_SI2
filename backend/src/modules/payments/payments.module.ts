import { Module } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentGatewayService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
