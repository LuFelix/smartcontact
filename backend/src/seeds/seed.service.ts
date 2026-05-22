// seeds/seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/roles/entities/role.entity';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async run() {
    this.logger.log('Iniciando o processo de seeding...');

    // 1. Criar as Roles
    const adminRole = await this.seedRoles();

    // 2. Criar o usuário Admin com a role de Administrador
    if (adminRole) {
      await this.seedAdminUser(adminRole);
    } else {
      this.logger.error('A role "administrador" não foi encontrada ou criada. O usuário admin não será populado.');
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
        if (savedRole.name === 'administrador') {
          adminRole = savedRole;
        }
      } else {
        this.logger.log(`Role '${roleName}' já existe.`);
        if (roleName === 'administrador') {
          adminRole = existingRole;
        }
      }
    }
    return adminRole;
  }

  private async seedAdminUser(adminRole: Role) {
    const adminEmail = 'admin@smartcontact.com.br';
    const adminPassword = 'Senha@123';

    const existingAdmin = await this.userRepository.findOne({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      const adminUser = this.userRepository.create({
        name: 'Usuário Administrador',
        email: adminEmail,
        cpf: '00000000000',
        password: hashedPassword,
        isVerified: true,
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
                isMain: true 
            }
        ]
      });
      adminUser.role = adminRole;
      await this.userRepository.save(adminUser);
      this.logger.log(`Usuário administrador com Email ${adminEmail} criado com sucesso.`);
    } else {
      this.logger.log(`Usuário administrador com Email ${adminEmail} já existe.`);
    }
  }
}
