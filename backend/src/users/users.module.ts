// users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { Phone } from './entities/phone.entity';
import { Address } from './entities/address.entity';
import { UserEmail } from './entities/user-email.entity';
import { UserLink } from './entities/user-link.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { UsersController } from './users.controller';
import { RolesService } from 'src/roles/roles.service';
import { ProfilesModule } from 'src/profiles/profiles.module';
import { TagsModule } from 'src/tags/tags.module';
import { GoogleContactsService } from './integrations/google-contacts/google-contacts.service';
import { GoogleContactsController } from './integrations/google-contacts/google-contacts.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Phone, Address, UserEmail, UserLink, Tag]),
    ProfilesModule,
    TagsModule,
  ],
  controllers: [UsersController, GoogleContactsController],
  providers: [UsersService, RolesService, GoogleContactsService],
  exports: [UsersService],
})
export class UsersModule {}
