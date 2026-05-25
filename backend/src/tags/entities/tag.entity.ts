import { User } from 'src/users/entities/user.entity';
import { InteractionLog } from 'src/interaction-logs/entities/interaction-log.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

export enum RedirectMode {
  PROFILE = 'PROFILE',
  WHATSAPP = 'WHATSAPP',
  VCARD = 'VCARD',
  CUSTOM_URL = 'CUSTOM_URL',
}

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index({ unique: true })
  uuid!: string;

  @Column({
    type: 'enum',
    enum: RedirectMode,
    default: RedirectMode.PROFILE,
    name: 'redirect_mode',
  })
  redirectMode!: RedirectMode;

  @Column({ type: 'varchar', name: 'custom_url', nullable: true })
  customUrl!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ type: 'uuid', name: 'owner_id', nullable: true })
  @Index()
  ownerId!: string | null;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @OneToMany(() => InteractionLog, (log) => log.tag)
  interactionLogs!: InteractionLog[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
