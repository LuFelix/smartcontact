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

  private readonly ceps = ['57030170', '57035170', '57020170', '57020600', '57010035', '57010170'];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async run(defaultRole: Role) {
    this.logger.log('Iniciando seed de 50 usuários com contatos...');

    const password = 'Senha!123';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    for (const [index, userData] of usersData.entries()) {
      // Slugify name for email
      const emailBase = userData.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
      const email = `${emailBase}@smartcontact.tiweb.app.br`;

      let user = await this.userRepository.findOne({ 
        where: { email },
        relations: ['phones', 'addresses']
      });

      const randomCep = this.ceps[Math.floor(Math.random() * this.ceps.length)];
      const randomPhone = `829${Math.floor(10000000 + Math.random() * 90000000)}`;

      const data = {
        name: userData.name,
        email: email,
        password: hashedPassword,
        isVerified: true,
        isActive: true,
        role: defaultRole,
        phones: [
            { number: randomPhone, isWhatsapp: Math.random() > 0.3, isMain: true }
        ],
        addresses: [
            {
                street: `Rua de Teste ${index + 1}`,
                number: `${100 + index}`,
                neighborhood: 'Bairro Teste',
                city: 'Maceió',
                state: 'AL',
                zipCode: randomCep,
                tag: 'HOME' as any,
                isMain: true
            }
        ]
      };

      if (!user) {
        user = this.userRepository.create(data);
        await this.userRepository.save(user);
        this.logger.log(`Usuário '${userData.name}' criado com contatos.`);
      } else {
        this.userRepository.merge(user, data);
        await this.userRepository.save(user);
        this.logger.log(`Usuário '${userData.name}' atualizado com contatos.`);
      }
    }

    this.logger.log('Seed de 50 usuários concluído.');
  }
}
