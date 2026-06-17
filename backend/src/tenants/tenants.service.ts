import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { slug } });
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({ where: { id } });
  }

  async create(name: string, slug: string, ownerId?: string): Promise<Tenant> {
    const tenant = this.tenantRepository.create({ name, slug, ownerId: ownerId || null });
    return this.tenantRepository.save(tenant);
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    await this.tenantRepository.update(id, data);
    return this.findById(id);
  }
}
