import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { CheckoutExpirationService } from './checkout-expiration.service.js';
import { SalesController } from './sales.controller.js';
import { SalesRepository } from './sales.repository.js';
import { SalesService } from './sales.service.js';

@Module({
  imports: [ConfigModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository, CheckoutExpirationService],
  exports: [SalesService],
})
export class SalesModule {}
