import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membership } from './entities/membership.entity';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [TypeOrmModule.forFeature([Membership])],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
