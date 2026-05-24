// users/entities/user.entity.ts
import { Role } from 'src/roles/entities/role.entity';
import { Profile } from '../../profiles/entities/profile.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { Phone } from './phone.entity';
import { Address } from './address.entity';
import { UserEmail } from './user-email.entity';
import { UserLink } from './user-link.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';

@Entity()
export class User {
    
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ length: 100, nullable: false })
    name!: string;

    @Index({ unique: true }) 
    @Column({ length: 100, nullable: false, unique: true })
    email!: string;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 11, unique: true, nullable: true }) 
    cpf!: string | null;

    @Column({ type: 'varchar', length: 100, nullable: false })
    password!: string;

    @ManyToOne(() => Role, role => role.users)
    @JoinColumn({ name: 'role_id' })
    role!: Role;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Column({ default: false })
    isVerified!: boolean;

    @Column({ default: true })
    isActive!: boolean;

    @Column({ type: 'varchar', nullable: true })
    verificationCode!: string | null;

    @Column({ type: 'timestamp', nullable: true })
    verificationExpires!: Date | null;

    @Column({ type: 'uuid', name: 'tenant_id', nullable: true })
    @Index()
    tenantId!: string | null;

    @Column({ type: 'uuid', name: 'owner_id', nullable: true })
    @Index()
    ownerId!: string | null;

    @OneToOne(() => Profile, (profile) => profile.user)
    profile?: Profile;

    @OneToMany(() => Tag, (tag) => tag.user)
    tags?: Tag[];

    @OneToMany(() => Phone, (phone) => phone.user, { cascade: true })
    phones?: Phone[];

    @OneToMany(() => Address, (address) => address.user, { cascade: true })
    addresses?: Address[];

    @OneToMany(() => UserEmail, (email) => email.user, { cascade: true })
    secondaryEmails?: UserEmail[];

    @OneToMany(() => UserLink, (link) => link.user, { cascade: true })
    links?: UserLink[];
}
