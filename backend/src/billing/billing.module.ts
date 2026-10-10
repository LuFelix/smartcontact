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
import { Membership } from '../memberships/entities/membership.entity';
import { Tag } from '../tags/entities/tag.entity';
import { InteractionLog } from '../interaction-logs/entities/interaction-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Plan, Subscription, Invoice, WebhookEvent, Membership, Tag, InteractionLog])],
  controllers: [BillingController],
  providers: [BillingService, PaymentGatewayFactory],
  exports: [BillingService, PaymentGatewayFactory],
})
export class BillingModule {}
