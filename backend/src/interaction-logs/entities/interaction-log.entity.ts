import { Tag } from 'src/tags/entities/tag.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('interaction_logs')
export class InteractionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Tag, (tag) => tag.interactionLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag!: Tag;

  @Column({ type: 'uuid', name: 'tag_id' })
  tagId!: string;

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
