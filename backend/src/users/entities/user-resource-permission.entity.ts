import type { Relation } from 'typeorm';
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('user_resources_permissions')
@Index(['userId', 'tagId', 'tenantId'], { unique: true })
export class UserResourcePermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'tag_id' })
  tagId!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
