import { User } from 'src/users/entities/user.entity';
import { InteractionLog } from 'src/interaction-logs/entities/interaction-log.entity';
import { UserTagAccess } from './user-tag-access.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

export enum RedirectMode {
  PROFILE = 'PROFILE',
  WHATSAPP = 'WHATSAPP',
  VCARD = 'VCARD',
  CUSTOM_URL = 'CUSTOM_URL',
}

export enum TechnologyType {
  NFC_HF = 'NFC_HF',
  RFID_UHF = 'RFID_UHF',
  QR_CODE = 'QR_CODE',
  LINK = 'LINK',
  TRILHA = 'TRILHA',
}

export enum ApplicationType {
  REDIRECT = 'REDIRECT',
  ASSET_COUNTING = 'ASSET_COUNTING',
  ACCESS_CONTROL = 'ACCESS_CONTROL',
}

@Entity('tags')
@Index(['uid', 'tenantId'], { unique: true })
@Unique(['userId', 'tenantId'])
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index({ unique: true })
  uuid!: string;

  @Column({ type: 'varchar', nullable: true })
  uid!: string | null;

  @Column({ type: 'varchar', unique: true, length: 120, nullable: true })
  @Index({ unique: true })
  handle!: string | null;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({
    type: 'enum',
    enum: TechnologyType,
    default: TechnologyType.NFC_HF,
    name: 'technology_type',
  })
  technologyType!: TechnologyType;

  @Column({
    type: 'enum',
    enum: ApplicationType,
    default: ApplicationType.REDIRECT,
    name: 'application_type',
  })
  applicationType!: ApplicationType;

  @Column({ type: 'varchar', nullable: true })
  value!: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_resource' })
  @Index()
  isResource!: boolean;

  @Column({
    type: 'enum',
    enum: RedirectMode,
    default: RedirectMode.PROFILE,
    name: 'nfc_redirect_mode',
  })
  nfcRedirectMode!: RedirectMode;

  @Column({ type: 'varchar', name: 'nfc_custom_url', nullable: true })
  nfcCustomUrl!: string | null;

  @Column({
    type: 'enum',
    enum: RedirectMode,
    default: RedirectMode.PROFILE,
    name: 'qr_redirect_mode',
  })
  qrRedirectMode!: RedirectMode;

  @Column({ type: 'varchar', name: 'qr_custom_url', nullable: true })
  qrCustomUrl!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @Column({ type: 'uuid', name: 'owner_id', nullable: true })
  @Index()
  ownerId!: string | null;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @OneToMany(() => InteractionLog, (log) => log.tag)
  interactionLogs!: InteractionLog[];

  @OneToMany(() => UserTagAccess, (access) => access.tag)
  accesses!: UserTagAccess[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
