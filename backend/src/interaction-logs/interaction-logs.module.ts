import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionLog } from './entities/interaction-log.entity';
import { InteractionLogsService } from './interaction-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([InteractionLog])],
  providers: [InteractionLogsService],
  exports: [InteractionLogsService],
})
export class InteractionLogsModule {}
