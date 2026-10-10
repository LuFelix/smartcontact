// billing/entities/subscription.entity.ts
import type { Relation } from 'typeorm';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Plan } from './plan.entity';
import { SubscriptionStatus } from '../billing.constants';

/**
 * Assinatura de um tenant (workspace). Exatamente 1 linha por tenant:
 * o estado evolui na mesma linha (status/periodo), nunca multi-linha.
 * Tenant SEM linha = plano Free (lazy default).
 */
@Entity('billing_subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'tenant_id', unique: true })
  tenantId!: string;

  @Column({ type: 'uuid', name: 'plan_id' })
  planId!: string;

  @ManyToOne(() => Plan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Relation<Plan>;

  @Column({ type: 'varchar', length: 20, default: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @Column({ type: 'timestamp', name: 'current_period_start', nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ type: 'timestamp', name: 'current_period_end', nullable: true })
  currentPeriodEnd!: Date | null;

  /**
   * Gateway usado (stripe | mercadopago). Preenchido pela BE-BILL-002.
   */
  @Column({ type: 'varchar', length: 20, name: 'payment_provider', nullable: true })
  paymentProvider!: string | null;

  /**
   * ID da assinatura no gateway. Preenchido pela BE-BILL-002.
   */
  @Column({ type: 'varchar', length: 120, name: 'external_id', nullable: true })
  externalId!: string | null;

  /**
   * ID do cliente no gateway (Stripe customer ID, MercadoPago payer ID).
   */
  @Column({ type: 'varchar', length: 120, name: 'provider_customer_id', nullable: true })
  providerCustomerId!: string | null;

  /**
   * ID da assinatura no gateway (Stripe subscription ID, MercadoPago preapproval ID).
   */
  @Column({ type: 'varchar', length: 120, name: 'provider_subscription_id', nullable: true })
  providerSubscriptionId!: string | null;

  /**
   * Data de cancelamento da assinatura.
   */
  @Column({ type: 'timestamp', name: 'canceled_at', nullable: true })
  canceledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
