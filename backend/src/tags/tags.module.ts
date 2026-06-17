import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { Tag } from './entities/tag.entity';
import { UserTagAccess } from './entities/user-tag-access.entity';
import { Profile } from 'src/profiles/entities/profile.entity';
import { User } from 'src/users/entities/user.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { InteractionLogsModule } from 'src/interaction-logs/interaction-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tag, UserTagAccess, User, Profile, Tenant]),
    InteractionLogsModule,
  ],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
