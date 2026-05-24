import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantMember } from './entities/tenant-member.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantMember)
    private readonly memberRepository: Repository<TenantMember>,
  ) {}

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  async create(name: string, slug: string): Promise<Tenant> {
    const tenant = this.tenantRepository.create({ name, slug });
    return this.tenantRepository.save(tenant);
  }

  async addMember(userId: string, tenantId: string, roleId: string): Promise<TenantMember> {
    const member = this.memberRepository.create({ userId, tenantId, roleId });
    return this.memberRepository.save(member);
  }

  async getUserTenants(userId: string): Promise<TenantMember[]> {
      return this.memberRepository.find({
          where: { userId },
          relations: ['tenant', 'role']
      });
  }
}
