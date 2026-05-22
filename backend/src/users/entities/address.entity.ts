import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum AddressTag {
  HOME = 'HOME',
  WORK = 'WORK',
  BILLING = 'BILLING',
  DELIVERY = 'DELIVERY',
  OTHER = 'OTHER',
}

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  street!: string;

  @Column({ length: 20 })
  number!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  complement!: string | null;

  @Column({ length: 100 })
  neighborhood!: string;

  @Column({ length: 100 })
  city!: string;

  @Column({ length: 2 })
  state!: string;

  @Column({ length: 10, name: 'zip_code' })
  zipCode!: string;

  @Column({
    type: 'enum',
    enum: AddressTag,
    default: AddressTag.OTHER,
  })
  tag!: AddressTag;

  @Column({ default: false, name: 'is_main' })
  isMain!: boolean;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;
}
