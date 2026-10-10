// billing/billing.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaymentGatewayFactory } from './gateways/payment-gateway.factory';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Invoice } from './entities/invoice.entity';
import { WebhookEvent } from './entities/webhook-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription, Invoice, WebhookEvent])],
  controllers: [BillingController],
  providers: [BillingService, PaymentGatewayFactory],
  exports: [BillingService, PaymentGatewayFactory],
})
export class BillingModule {}
