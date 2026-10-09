// billing/entities/plan.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BillingInterval } from '../billing.constants';

/**
 * Catálogo GLOBAL de planos de cobrança (sem tenant_id).
 * Os limites são nullable: null = ilimitado.
 */
@Entity('billing_plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Código estável do plano (ex.: free, pro, business).
   * Âncora do upsert idempotente do seed do módulo.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 30, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Preço mensal em centavos (BRL). 0 = gratuito.
   */
  @Column({ type: 'int', name: 'price_cents', default: 0 })
  priceCents!: number;

  @Column({ type: 'varchar', length: 12, default: BillingInterval.MONTHLY })
  interval!: BillingInterval;

  /**
   * Limite de membros do workspace. null = ilimitado.
   */
  @Column({ type: 'int', name: 'max_members', nullable: true })
  maxMembers!: number | null;

  /**
   * Limite de tags. null = ilimitado.
   */
  @Column({ type: 'int', name: 'max_tags', nullable: true })
  maxTags!: number | null;

  /**
   * Limite de leads. null = ilimitado.
   */
  @Column({ type: 'int', name: 'max_leads', nullable: true })
  maxLeads!: number | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
