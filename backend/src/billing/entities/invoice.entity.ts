// billing/entities/invoice.entity.ts
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
import { Subscription } from './subscription.entity';
import { InvoiceStatus } from '../billing.constants';

/**
 * Fatura de uma assinatura. Base para a BE-BILL-002 (webhooks Stripe/MercadoPago).
 */
@Entity('billing_invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @Index()
  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId!: string;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Relation<Subscription>;

  @Column({ type: 'uuid', name: 'plan_id', nullable: true })
  planId!: string | null;

  @ManyToOne(() => Plan, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Relation<Plan> | null;

  @Column({ type: 'int', name: 'amount_cents', default: 0 })
  amountCents!: number;

  @Column({ type: 'varchar', length: 3, default: 'BRL' })
  currency!: string;

  @Column({ type: 'varchar', length: 20, default: InvoiceStatus.OPEN })
  status!: InvoiceStatus;

  @Column({ type: 'varchar', length: 20, name: 'payment_provider', nullable: true })
  paymentProvider!: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, name: 'external_id', nullable: true, unique: true })
  externalId!: string | null;

  @Column({ type: 'timestamp', name: 'issued_at', nullable: true })
  issuedAt!: Date | null;

  @Column({ type: 'timestamp', name: 'paid_at', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
