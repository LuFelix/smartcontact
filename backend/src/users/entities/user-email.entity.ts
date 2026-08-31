import type { Relation } from 'typeorm';
// users/entities/user-email.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('user_emails')
export class UserEmail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100, nullable: false })
  address!: string;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ type: 'uuid', name: 'owner_id', nullable: true })
  @Index()
  ownerId!: string | null;

  @ManyToOne(() => User, (user) => user.secondaryEmails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
