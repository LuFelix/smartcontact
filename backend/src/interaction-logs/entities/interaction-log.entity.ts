import { Tag } from 'src/tags/entities/tag.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum InteractionType {
  VISIT = 'VISIT',
  LEAD = 'LEAD',
}

@Entity('interaction_logs')
export class InteractionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Tag, (tag) => tag.interactionLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag!: Tag;

  @Column({ type: 'uuid', name: 'tag_id' })
  tagId!: string;

  @Column({
      type: 'enum',
      enum: InteractionType,
      default: InteractionType.VISIT,
      name: 'interaction_type'
  })
  interactionType!: InteractionType;

  @Column({ type: 'varchar', name: 'lead_name', nullable: true })
  leadName!: string | null;

  @Column({ type: 'varchar', name: 'lead_email', nullable: true })
  leadEmail!: string | null;

  @Column({ type: 'varchar', name: 'lead_phone', nullable: true })
  leadPhone!: string | null;

  @Column({ type: 'varchar', name: 'lead_note', length: 50, nullable: true })
  leadNote!: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'captured_by_user_id' })
  capturedByUser!: User | null;

  @Column({ type: 'uuid', name: 'captured_by_user_id', nullable: true })
  capturedByUserId!: string | null;

  @Column({ type: 'varchar', name: 'ip_address', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', name: 'user_agent', nullable: true })
  userAgent!: string | null;

  @Column({ type: 'varchar', name: 'device_type', nullable: true })
  deviceType!: string | null;

  @Column({ type: 'varchar', name: 'browser', nullable: true })
  browser!: string | null;

  @CreateDateColumn({ name: 'accessed_at' })
  accessedAt!: Date;
}
