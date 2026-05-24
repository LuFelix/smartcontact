// seeds/users/user-seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { Tag, RedirectMode } from 'src/tags/entities/tag.entity';
import { usersData } from './users-data';

@Injectable()
export class UserSeedService {
  private readonly logger = new Logger(UserSeedService.name);

  private readonly ceps = ['57030170', '57035170', '57020170', '57020600', '57010035', '57010170'];

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
  ) {}

  async run(defaultRole: Role, admin: User) {
    this.logger.log('Iniciando seed de 50 usuários com contatos e tags...');

    const password = 'Senha!123';
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    for (const [index, userData] of usersData.entries()) {
      const emailBase = userData.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f|]/g, "").replace(/\s+/g, '-');
      const email = `${emailBase}@smartcontact.tiweb.app.br`;

      let user = await this.userRepository.findOne({ 
        where: { email },
        relations: ['phones', 'addresses', 'tags']
      });

      const randomCep = this.ceps[Math.floor(Math.random() * this.ceps.length)];
      const randomPhone = `829${Math.floor(10000000 + Math.random() * 90000000)}`;

      const data: DeepPartial<User> = {
        name: userData.name,
        email: email,
        password: hashedPassword,
        isVerified: true,
        isActive: true,
        role: defaultRole,
        ownerId: admin.id, // O criador é o Admin
        tenantId: admin.tenantId, // Pertencem à mesma empresa (Tiweb)
        phones: [
            { number: randomPhone, isWhatsapp: Math.random() > 0.3, isMain: true, ownerId: admin.id, tenantId: admin.tenantId }
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
                isMain: true,
                ownerId: admin.id,
                tenantId: admin.tenantId
            }
        ]
      };

      if (!user) {
        user = this.userRepository.create(data);
        user = await this.userRepository.save(user);
        this.logger.log(`Usuário '${userData.name}' criado.`);
      } else {
        this.userRepository.merge(user, data);
        user = await this.userRepository.save(user);
        this.logger.log(`Usuário '${userData.name}' atualizado.`);
      }

      if (!user.tags || user.tags.length === 0) {
          const newTagData: DeepPartial<Tag> = {
              uuid: `test-tag-${emailBase}`,
              userId: user.id,
              ownerId: admin.id,
              tenantId: admin.tenantId as string,
              redirectMode: RedirectMode.PROFILE,
              isActive: true
          };
          const newTag = this.tagRepository.create(newTagData);
          await this.tagRepository.save(newTag);
          this.logger.log(`Tag 'test-tag-${emailBase}' criada para o usuário.`);
      }
    }

    this.logger.log('Seed de 50 usuários e tags concluído.');
  }
}
