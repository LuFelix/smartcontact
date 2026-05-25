// seeds/seed.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from 'src/users/entities/user.entity';
import { Role } from 'src/roles/entities/role.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { SeedService } from './seed.service';
import { UserSeedService } from './users/user-seed.service';
import { ProfilesModule } from 'src/profiles/profiles.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([Role, User, Tag]),
    ProfilesModule,
  ],
  providers: [SeedService, UserSeedService],
  exports: [SeedService],
})
export class SeedModule {}
