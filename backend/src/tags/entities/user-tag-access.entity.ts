import type { Relation } from 'typeorm';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Tag } from './tag.entity';

/**
 * Representa a delegação de acesso a uma Tag/Turma específica para um usuário.
 * Essencial para o cenário ABAC (ex: Tutor acessando apenas certas turmas).
 */
@Entity('user_tag_access')
@Index(['userId', 'tagId'], { unique: true })
export class UserTagAccess {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: Relation<User>;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag!: Relation<Tag>;

  @Column({ name: 'tag_id' })
  tagId!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @Column({ type: 'uuid', name: 'granted_by' })
  grantedBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
