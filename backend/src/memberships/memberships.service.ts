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

  async findTeamWorkspacesByUser(userId: string) {
    const memberships = await this.membershipRepository.find({
      where: { userId },
      relations: ['tenant', 'role', 'profile'],
    });
    // Retorna apenas os workspaces onde o usuário é administrador ou usuario (exclui contato)
    return memberships.filter(m => m.role && m.role.name.toLowerCase() !== 'contato');
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
    return this.membershipRepository.update(membership.id, { roleId });
  }

  async updateRoleAndProfile(userId: string, tenantId: string, roleId: string, profileId: string | null) {
    const membership = await this.findByUserAndTenant(userId, tenantId);
    if (!membership) {
      throw new NotFoundException('Vínculo não encontrado neste workspace.');
    }
    return this.membershipRepository.update(membership.id, { roleId, profileId });
  }

  async updateProfileId(userId: string, tenantId: string, profileId: string | null) {
    const membership = await this.findByUserAndTenant(userId, tenantId);
    if (!membership) {
      throw new NotFoundException('Vínculo não encontrado neste workspace.');
    }
    return this.membershipRepository.update(membership.id, { profileId });
  }
}
