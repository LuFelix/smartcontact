// users/entities/user.entity.ts
import { Role } from 'src/roles/entities/role.entity';
import { Profile } from '../../profiles/entities/profile.entity';
import { Tag } from '../../tags/entities/tag.entity';
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

    @Column({ type: 'varchar', length: 11, nullable: true })
    phonenumber!: string | null;

    @Column({ type: 'varchar', length: 8, nullable: true })
    cep!: string | null;

    @Column({ type: 'varchar', length: 2, nullable: true })
    uf!: string | null;

    @Column({ type: 'varchar',length: 30, nullable: true })
    city!: string | null;

    @Column({type: 'varchar', length: 40, nullable: true })
    neighborhood!: string | null;

    @Column({ type: 'varchar',length: 100, nullable: true })
    street!: string | null;

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

    @Column({ type: 'varchar', nullable: true })
    verificationCode!: string | null;

    @Column({ type: 'timestamp', nullable: true })
    verificationExpires!: Date | null;

    @OneToOne(() => Profile, (profile) => profile.user)
    profile?: Profile;

    @OneToMany(() => Tag, (tag) => tag.user)
    tags?: Tag[];
}
