// seeds/seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/roles/entities/role.entity';
import { User } from 'src/users/entities/user.entity';
import { UserSeedService } from './users/user-seed.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userSeedService: UserSeedService,
  ) {}

  async run() {
    this.logger.log('Iniciando o processo de seeding...');

    const adminRole = await this.seedRoles();

    if (adminRole) {
      await this.seedAdminUser(adminRole);
      
      // Busca a role de colaborador para o seed de 50 usuários
      const colaboradorRole = await this.roleRepository.findOne({ where: { name: 'colaborador' } });
      if (colaboradorRole) {
          await this.userSeedService.run(colaboradorRole);
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

  private async seedAdminUser(adminRole: Role) {
    const adminEmail = 'admin@smartcontact.com.br';
    const adminPassword = 'Senha@123';

    let admin = await this.userRepository.findOne({ 
        where: { email: adminEmail },
        relations: ['phones', 'addresses']
    });

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const adminData = {
        name: 'Usuário Administrador',
        email: adminEmail,
        cpf: '00000000000',
        password: hashedPassword,
        isVerified: true,
        role: adminRole,
        // Garante que o admin tenha ao menos um telefone e endereço no formato novo
        phones: [
            { number: '00000000000', isWhatsapp: true, isMain: true }
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
                tag: 'WORK' as any
            }
        ]
    };

    if (!admin) {
      admin = this.userRepository.create(adminData);
      await this.userRepository.save(admin);
      this.logger.log(`Usuário administrador criado com sucesso.`);
    } else {
      // Atualiza o administrador existente com os novos dados (Importante para migração de estrutura)
      this.userRepository.merge(admin, adminData);
      await this.userRepository.save(admin);
      this.logger.log(`Usuário administrador atualizado para a nova estrutura.`);
    }
  }
}
