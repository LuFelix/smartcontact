import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('billing_webhook_events')
@Index(['provider', 'eventId'], { unique: true })
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  provider: 'stripe' | 'mercadopago';

  @Column({ type: 'varchar', length: 128 })
  eventId: string;

  @Column({ type: 'varchar', length: 64 })
  eventType: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  payloadHash: string;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processedAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt: Date;
}