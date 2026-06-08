// seeds/seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/roles/entities/role.entity';
import { User } from 'src/users/entities/user.entity';
import { Tag, RedirectMode } from 'src/tags/entities/tag.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { Membership } from 'src/memberships/entities/membership.entity';
import { UserSeedService } from './users/user-seed.service';
import { ProfilesService } from 'src/profiles/profiles.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);
  private readonly TIWEB_ID = 'aebfbdfa-0088-4bf1-9bee-36529cfc3866';

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    private readonly userSeedService: UserSeedService,
    private readonly profilesService: ProfilesService,
  ) {}

  async run() {
    this.logger.log('Iniciando o processo de seeding...');

    // 0. Garante que o Tenant Master existe
    await this.seedDefaultTenant();

    // 1. Garante que todos os usuários tenham usernames (Migração retroativa)
    await this.userSeedService.migrateUsernames();

    const adminRole = await this.seedRoles();

    if (adminRole) {
      const admin = await this.seedAdminUser(adminRole);

      // 2. Define o owner_id do Tenant Master (após o admin ser criado)
      await this.tenantRepository.update(this.TIWEB_ID, { ownerId: admin.id });
      
      const contatoRole = await this.roleRepository.findOne({ where: { name: 'contato' } });
      if (contatoRole && admin) {
          await this.userSeedService.run(contatoRole, admin);
      }
    } else {
      this.logger.error('A role "administrador" não foi encontrada ou criada.');
    }

    this.logger.log('Seeding concluído com sucesso.');
  }

  private async seedDefaultTenant(): Promise<void> {
    const existing = await this.tenantRepository.findOne({ where: { id: this.TIWEB_ID } });
    if (!existing) {
      const tenant = this.tenantRepository.create({
        id: this.TIWEB_ID,
        name: 'TIWEB Master',
        slug: 'tiweb',
        isActive: true
      });
      await this.tenantRepository.save(tenant);
      this.logger.log('Tenant Master (TIWEB) criado.');
    }
  }

  private async seedRoles(): Promise<Role | undefined> {
    const rolesToCreate = ['administrador', 'contato', 'usuario'];
    let adminRole: Role | undefined;

    for (const roleName of rolesToCreate) {
      const existingRole = await this.roleRepository.findOne({ where: { name: roleName } });

      if (!existingRole) {
        const newRole = this.roleRepository.create({ name: roleName });
        const savedRole = await this.roleRepository.save(newRole);
        this.logger.log(`Role '${savedRole.name}' criada.`);
        if (savedRole.name === 'administrador') adminRole = savedRole;
      } else {
        if (roleName === 'administrador') adminRole = existingRole;
      }
    }
    return adminRole;
  }

  private async seedAdminUser(adminRole: Role): Promise<User | undefined> {
    const adminEmail = 'admin@smartcontact.com.br';
    const adminPassword = 'Senha@123';

    let admin = await this.userRepository.findOne({ 
        where: { email: adminEmail },
        relations: ['phones', 'addresses', 'memberships']
    });

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const adminData: DeepPartial<User> = {
        id: this.TIWEB_ID, // Fixar o ID do admin para facilitar ownerId
        name: 'Usuário Administrador',
        email: adminEmail,
        cpf: '00000000000',
        password: hashedPassword,
        isVerified: true,
        ownerId: this.TIWEB_ID,
        phones: [
            { number: '00000000000', isWhatsapp: true, isMain: true, ownerId: this.TIWEB_ID, tenantId: this.TIWEB_ID }
        ],
        addresses: [
            { 
                street: 'Rua do Admin', 
                number: '1', 
                neighborhood: 'Centro', 
                city: 'Maceió', 
                state: 'AL', 
                zipCode: '00000000', 
                isMain: true,
                tag: 'WORK' as any,
                ownerId: this.TIWEB_ID,
                tenantId: this.TIWEB_ID
            }
        ]
    };

    if (!admin) {
      admin = this.userRepository.create(adminData);
      admin = await this.userRepository.save(admin);
      this.logger.log(`Usuário administrador criado com sucesso.`);
    } else {
      this.userRepository.merge(admin, adminData);
      admin = await this.userRepository.save(admin);
      this.logger.log(`Usuário administrador atualizado para a nova estrutura.`);
    }

    // GARANTE QUE O ADMIN TENHA UM PROFILE
    let adminProfile = await this.profilesService.findByUserId(admin.id);
    if (!adminProfile) {
        adminProfile = await this.profilesService.create({
            userId: admin.id,
            ownerId: this.TIWEB_ID,
            tenantId: this.TIWEB_ID
        });
    }

    // GARANTE QUE O ADMIN TENHA O VINCULO DE MEMBERSHIP
    const adminMembership = await this.membershipRepository.findOne({ where: { userId: admin.id, tenantId: this.TIWEB_ID } });
    if (!adminMembership) {
        const newMembership = this.membershipRepository.create({
            userId: admin.id,
            tenantId: this.TIWEB_ID,
            roleId: adminRole.id,
            profileId: adminProfile.id
        });
        await this.membershipRepository.save(newMembership);
    }

    const adminTag = await this.tagRepository.findOne({ where: { userId: admin.id } });
    if (!adminTag) {
        const newTagData: DeepPartial<Tag> = {
            uuid: 'test-tag-admin',
            userId: admin.id,
            ownerId: this.TIWEB_ID,
            tenantId: this.TIWEB_ID,
            nfcRedirectMode: RedirectMode.PROFILE,
            qrRedirectMode: RedirectMode.PROFILE,
            isActive: true
        };
        const newTag = this.tagRepository.create(newTagData);
        await this.tagRepository.save(newTag);
        this.logger.log(`Tag 'test-tag-admin' criada para o administrador.`);
    }
    return admin;
  }
}
