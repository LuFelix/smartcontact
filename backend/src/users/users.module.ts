// users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { Phone } from './entities/phone.entity';
import { Address } from './entities/address.entity';
import { UsersController } from './users.controller';
import { RolesService } from 'src/roles/roles.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Phone, Address]),
  ],
  controllers: [UsersController],
  providers: [UsersService, RolesService],
  exports: [UsersService],
})
export class UsersModule {}
