import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantMember } from './entities/tenant-member.entity';
import { TenantsService } from './tenants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, TenantMember])],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
