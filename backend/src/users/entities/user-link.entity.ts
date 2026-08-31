import type { Relation } from 'typeorm';
// users/entities/user-link.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('user_links')
export class UserLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50, nullable: false })
  title!: string;

  @Column({ length: 255, nullable: false })
  url!: string;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ type: 'uuid', name: 'owner_id', nullable: true })
  @Index()
  ownerId!: string | null;

  @ManyToOne(() => User, (user) => user.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;
}
