// users/entities/user-link.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_links')
export class UserLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 50, nullable: false })
  title!: string;

  @Column({ length: 255, nullable: false })
  url!: string;

  @ManyToOne(() => User, (user) => user.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
