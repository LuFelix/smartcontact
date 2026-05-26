// seeds/users/user-seed.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { Tag, RedirectMode } from 'src/tags/entities/tag.entity';
import { ProfilesService } from 'src/profiles/profiles.service';
import { UsersService } from 'src/users/users.service';
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
    private readonly profilesService: ProfilesService,
    private readonly usersService: UsersService,
  ) {}

  async migrateUsernames() {
      this.logger.log('Iniciando migração de usernames...');
      await this.usersService.migrateUsernames();
  }

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

      // GERA USERNAME ÚNICO PARA O SEED
      const username = await this.usersService.generateUniqueUsername(userData.name);

      const data: DeepPartial<User> = {
        name: userData.name,
        email: email,
        username: username,
        password: hashedPassword,
        isVerified: true,
        isActive: true,
        role: defaultRole,
        ownerId: admin.id, 
        tenantId: admin.tenantId,
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
        // Usa o usersService.create para garantir o ciclo de vida completo
        user = await this.usersService.create(data as any, admin);
        this.logger.log(`Usuário '${userData.name}' criado via UsersService.`);
      } else {
        this.userRepository.merge(user, data);
        if (!user.username) {
            user.username = username;
        }
        user = await this.userRepository.save(user);
        this.logger.log(`Usuário '${userData.name}' atualizado.`);

        // GARANTE QUE O USUÁRIO TENHA UM PROFILE
        const profile = await this.profilesService.findByUserId(user.id);
        if (!profile) {
            await this.profilesService.create({
                userId: user.id,
                ownerId: admin.id,
                tenantId: admin.tenantId as string
            });
        }
      }

      if (user && (!user.tags || user.tags.length === 0)) {
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
