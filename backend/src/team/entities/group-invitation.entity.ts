import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Role } from 'src/roles/entities/role.entity';

@Entity('group_invitations')
export class GroupInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ unique: true })
  token!: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'role_id' })
  roleId!: string;

  @Column({ name: 'expires_at' })
  expiresAt!: Date;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @Column({ name: 'created_by' })
  createdById!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
