// seeds/seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/roles/entities/role.entity';
import { User } from 'src/users/entities/user.entity';
import { Tag, RedirectMode } from 'src/tags/entities/tag.entity';
import { UserSeedService } from './users/user-seed.service';

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
    private readonly userSeedService: UserSeedService,
  ) {}

  async run() {
    this.logger.log('Iniciando o processo de seeding...');

    const adminRole = await this.seedRoles();

    if (adminRole) {
      const admin = await this.seedAdminUser(adminRole);
      
      const colaboradorRole = await this.roleRepository.findOne({ where: { name: 'colaborador' } });
      if (colaboradorRole && admin) {
          await this.userSeedService.run(colaboradorRole, admin);
      }
    } else {
      this.logger.error('A role "administrador" não foi encontrada ou criada.');
    }

    this.logger.log('Seeding concluído com sucesso.');
  }

  private async seedRoles(): Promise<Role | undefined> {
    const rolesToCreate = ['administrador', 'colaborador', 'usuario'];
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

    const adminTag = await this.tagRepository.findOne({ where: { userId: admin.id } });
    if (!adminTag) {
        const newTagData: DeepPartial<Tag> = {
            uuid: 'test-tag-admin',
            userId: admin.id,
            ownerId: this.TIWEB_ID,
            tenantId: this.TIWEB_ID,
            redirectMode: RedirectMode.PROFILE,
            isActive: true
        };
        const newTag = this.tagRepository.create(newTagData);
        await this.tagRepository.save(newTag);
        this.logger.log(`Tag 'test-tag-admin' criada para o administrador.`);
    }
    return admin;
  }
}
