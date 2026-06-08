import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { InvitationsController } from './invitations.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { GroupInvitation } from './entities/group-invitation.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroupInvitation, User]),
    UsersModule,
    TenantsModule,
    forwardRef(() => AuthModule),
  ],
  providers: [TeamService],
  controllers: [TeamController, InvitationsController],
  exports: [TeamService],
})
export class TeamModule {}
