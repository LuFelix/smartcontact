import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionLog } from './entities/interaction-log.entity';
import { InteractionLogsService } from './interaction-logs.service';
import { InteractionLogsController } from './interaction-logs.controller';
import { UserTagAccess } from 'src/tags/entities/user-tag-access.entity';
import { Tag } from 'src/tags/entities/tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InteractionLog, UserTagAccess, Tag])],
  providers: [InteractionLogsService],
  controllers: [InteractionLogsController],
  exports: [InteractionLogsService],
})
export class InteractionLogsModule {}
