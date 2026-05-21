import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('phones')
export class Phone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 20 })
  number!: string;

  @Column({ default: false, name: 'is_whatsapp' })
  isWhatsapp!: boolean;

  @Column({ default: false, name: 'is_main' })
  isMain!: boolean;

  @ManyToOne(() => User, (user) => user.phones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;
}
