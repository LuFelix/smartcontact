import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tag, RedirectMode } from './entities/tag.entity';
import { UserTagAccess } from './entities/user-tag-access.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(UserTagAccess)
    private readonly accessRepository: Repository<UserTagAccess>,
  ) {}

  async createDefaultTag(userId: string, ownerId: string, tenantId: string): Promise<Tag> {
      const tag = this.tagRepository.create({
          uuid: uuidv4(),
          userId,
          ownerId,
          tenantId,
          redirectMode: RedirectMode.PROFILE,
          isActive: true
      });
      return this.tagRepository.save(tag);
  }

  /**
   * Lista as tags/turmas considerando o controle de acesso ABAC.
   * - Admins vêem tudo do tenant.
   * - Outros (Tutores/Colaboradores) vêem o que criaram ou o que foi delegado.
   */
  async findAll(currentUser: any): Promise<Tag[]> {
      const { sub: userId, tenantId, role, isSuperAdmin } = currentUser;

      // 1. Super Admin vê tudo globalmente (gestão)
      if (isSuperAdmin) {
          return this.tagRepository.find({ relations: ['user'] });
      }

      // 2. Admin do Tenant vê tudo da sua organização
      if (role === 'administrador') {
          return this.tagRepository.find({ 
              where: { tenantId },
              relations: ['user']
          });
      }

      // 3. Outros (Tutor/Colaborador): Visão restrita (ABAC)
      // Buscamos as tags onde ele tem acesso delegado
      const delegatedAccess = await this.accessRepository.find({
          where: { userId },
          select: ['tagId']
      });
      const delegatedTagIds = delegatedAccess.map(a => a.tagId);

      return this.tagRepository.find({
          where: [
              { ownerId: userId }, // O que ele mesmo criou
              { id: In(delegatedTagIds) } // O que foi delegado a ele
          ],
          relations: ['user']
      });
  }

  /**
   * Delega o acesso de uma Tag a um sub-usuário (ex: dar uma turma para um Tutor).
   */
  async grantAccess(tagId: string, targetUserId: string, currentUser: any) {
      const { sub: granterId, tenantId, role } = currentUser;

      // Apenas Admins podem delegar recursos
      if (role !== 'administrador') {
          throw new ForbiddenException('Apenas administradores podem delegar acesso a recursos.');
      }

      const tag = await this.tagRepository.findOne({ where: { id: tagId, tenantId } });
      if (!tag) {
          throw new NotFoundException('Tag não encontrada no seu ambiente.');
      }

      const access = this.accessRepository.create({
          tagId,
          userId: targetUserId,
          tenantId,
          grantedBy: granterId
      });

      return this.accessRepository.save(access);
  }

  async resolveTag(uuid: string) {
    const tag = await this.tagRepository.findOne({
      where: { uuid, isActive: true },
      relations: [
        'user',
        'user.profile',
        'user.phones',
        'user.addresses',
        'user.secondaryEmails',
        'user.links',
      ],
    });

    if (!tag) return null;

    // Filter sensitive data
    const { user } = tag;
    const publicUser = {
      name: user.name,
      email: user.email,
      profile: user.profile,
      phones: user.phones,
      addresses: user.addresses,
      secondaryEmails: user.secondaryEmails,
      links: user.links,
    };

    return {
      id: tag.id,
      redirectMode: tag.redirectMode,
      customUrl: tag.customUrl,
      user: publicUser,
    };
  }

  /**
   * Verifica se um usuário tem permissão para gerenciar/visualizar uma tag específica.
   */
  async validateAccess(tagId: string, currentUser: any): Promise<void> {
      const { sub: userId, tenantId, role, isSuperAdmin } = currentUser;

      if (isSuperAdmin) return;

      const tag = await this.tagRepository.findOne({ where: { id: tagId } });
      if (!tag) throw new NotFoundException('Tag não encontrada.');

      // Bloqueio Multi-Tenant
      if (tag.tenantId !== tenantId) {
          throw new ForbiddenException('Acesso negado: Este recurso pertence a outra organização.');
      }

      // Bloqueio ABAC (Se for admin do tenant, passa)
      if (role === 'administrador') return;

      // Se for colaborador/tutor, verifica owner ou delegação
      const hasDelegatedAccess = await this.accessRepository.findOne({ 
          where: { tagId, userId } 
      });

      if (tag.ownerId !== userId && !hasDelegatedAccess) {
          throw new ForbiddenException('Você não tem permissão para acessar este recurso (Tag/Turma).');
      }
  }
}
