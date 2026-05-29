// seeds/seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/roles/entities/role.entity';
import { User } from 'src/users/entities/user.entity';
import { Tag, RedirectMode } from 'src/tags/entities/tag.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
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
    private readonly userSeedService: UserSeedService,
    private readonly profilesService: ProfilesService,
  ) {}

  async run() {
    this.logger.log('Iniciando o processo de seeding...');

    // 0. Garante que o Tenant Master existe
    await this.seedDefaultTenant();

    // 0.1. "Database Doctor": Garante que todos os tenants usados por usuários existam
    await this.fixMissingTenants();

    // 1. Garante que todos os usuários tenham usernames (Migração retroativa)
    await this.userSeedService.migrateUsernames();

    const adminRole = await this.seedRoles();

    if (adminRole) {
      const admin = await this.seedAdminUser(adminRole);
      
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

  /**
   * Varre a tabela de usuários e cria registros de Tenant para qualquer ID que não exista.
   * Isso evita erros de chave estrangeira em ambientes com dados "sujos".
   */
  private async fixMissingTenants(): Promise<void> {
    const users = await this.userRepository.find({ select: ['tenantId'] });
    const uniqueTenantIds = [...new Set(users.map(u => u.tenantId).filter(id => !!id))];

    for (const tenantId of uniqueTenantIds) {
      const exists = await this.tenantRepository.findOne({ where: { id: tenantId! } });
      if (!exists) {
        this.logger.warn(`Tenant ID ${tenantId} encontrado em usuários mas não na tabela de Tenants. Corrigindo...`);
        const newTenant = this.tenantRepository.create({
          id: tenantId!,
          name: `Tenant Recuperado (${tenantId?.substring(0, 8)})`,
          slug: `recovered-${tenantId?.substring(0, 8)}`,
          isActive: true
        });
        await this.tenantRepository.save(newTenant);
      }
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
        relations: ['phones', 'addresses']
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
        role: adminRole,
        ownerId: this.TIWEB_ID,
        tenantId: this.TIWEB_ID,
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
    const adminProfile = await this.profilesService.findByUserId(admin.id);
    if (!adminProfile) {
        await this.profilesService.create({
            userId: admin.id,
            ownerId: this.TIWEB_ID,
            tenantId: this.TIWEB_ID
        });
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
