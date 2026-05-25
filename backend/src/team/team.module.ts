import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [TeamService],
  controllers: [TeamController],
  exports: [TeamService],
})
export class TeamModule {}
