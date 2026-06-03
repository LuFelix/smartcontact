// roles/entities/role.entity.ts
import { Membership } from '../../memberships/entities/membership.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';

/**
 * Representa uma 'role' de usuário no sistema.
 * Ex: "administrador", "gente_e_cultura", "colaborador", etc.
 */

@Entity('roles')
@Index(['name', 'tenantId'], { unique: true })
export class Role {
  /**
   * ID único da 'role'.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Nome do papel (normalizado).
   * Ex: "administrador", "gente_e_cultura", "colaborador", etc.
   */
  @Column()
  name!: string;

  /**
   * Nome do papel (normalizado e único).
   * Ex: "administrador", "gente_e_cultura", "colaborador", etc.
   */
  @Column({ nullable: true })
  description!: string;

  /**
   * Lista de vínculos de membros que utilizam esta 'role'.
   */
  @OneToMany(() => Membership, (membership) => membership.role)
  memberships!: Membership[];

  @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ type: 'uuid', name: 'owner_id', nullable: true })
  @Index()
  ownerId!: string | null;
}