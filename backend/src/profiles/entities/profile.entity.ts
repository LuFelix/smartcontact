import { User } from 'src/users/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ length: 50, default: 'light' })
  theme!: string;

  @Column({ type: 'varchar', name: 'profile_picture_url', nullable: true })
  profilePictureUrl!: string | null;

  @Column({ type: 'jsonb', name: 'social_links', nullable: true })
  socialLinks!: any;

  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ type: 'uuid', name: 'owner_id', nullable: true })
  @Index()
  ownerId!: string | null;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
