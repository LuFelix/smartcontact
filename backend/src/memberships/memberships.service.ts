import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from './entities/membership.entity';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
  ) {}

  async create(data: { userId: string; tenantId: string; roleId: string; profileId?: string | null }) {
    const membership = this.membershipRepository.create(data);
    return this.membershipRepository.save(membership);
  }

  async findByUser(userId: string) {
    return this.membershipRepository.find({
      where: { userId },
      relations: ['tenant', 'role', 'profile'],
    });
  }

  async findByUserAndTenant(userId: string, tenantId: string) {
    return this.membershipRepository.findOne({
      where: { userId, tenantId },
      relations: ['tenant', 'role', 'profile'],
    });
  }

  async remove(userId: string, tenantId: string) {
    const membership = await this.findByUserAndTenant(userId, tenantId);
    if (!membership) {
      throw new NotFoundException('Vínculo não encontrado neste workspace.');
    }
    return this.membershipRepository.remove(membership);
  }

  async updateRole(userId: string, tenantId: string, roleId: string) {
    const membership = await this.findByUserAndTenant(userId, tenantId);
    if (!membership) {
      throw new NotFoundException('Vínculo não encontrado neste workspace.');
    }
    membership.roleId = roleId;
    membership.role = null as any; // Limpa a relação carregada para forçar o uso do novo roleId
    return this.membershipRepository.save(membership);
  }

  async updateProfileId(userId: string, tenantId: string, profileId: string | null) {
    const membership = await this.findByUserAndTenant(userId, tenantId);
    if (!membership) {
      throw new NotFoundException('Vínculo não encontrado neste workspace.');
    }
    membership.profileId = profileId;
    return this.membershipRepository.save(membership);
  }
}
