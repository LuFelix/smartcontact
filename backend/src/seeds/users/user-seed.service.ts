// seeds/users/user-seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
// Importação direta usando CommonJS require para evitar problemas de iterabilidade com import *
const usersData = require('./users-data.json');

@Injectable()
export class UserSeedService {
  private readonly logger = new Logger(UserSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async run(defaultRole: Role) {
    this.logger.log('Iniciando seed de 50 usuários...');

    const password = 'Senha!123';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    for (const userData of usersData) {
      // Slugify name for email
      const emailBase = userData.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const email = `${emailBase}@smartcontact.tiweb.app.br`;

      const existingUser = await this.userRepository.findOne({ where: { email } });

      if (!existingUser) {
        const newUser = this.userRepository.create({
          name: userData.name,
          email: email,
          password: hashedPassword,
          isVerified: true,
          isActive: true,
          role: defaultRole,
        });
        await this.userRepository.save(newUser);
        this.logger.log(`Usuário '${userData.name}' criado.`);
      }
    }

    this.logger.log('Seed de 50 usuários concluído.');
  }
}
