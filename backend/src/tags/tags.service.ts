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
          nfcRedirectMode: RedirectMode.PROFILE,
          qrRedirectMode: RedirectMode.PROFILE,
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

      const existingAccess = await this.accessRepository.findOne({
          where: { tagId, userId: targetUserId }
      });

      if (existingAccess) {
          return existingAccess; // Já tem acesso
      }

      const access = this.accessRepository.create({
          tagId,
          userId: targetUserId,
          tenantId,
          grantedBy: granterId
      });

      return this.accessRepository.save(access);
  }

  /**
   * Revoga o acesso de uma Tag previamente delegada a um sub-usuário.
   */
  async revokeAccess(tagId: string, targetUserId: string, currentUser: any) {
      const { tenantId, role } = currentUser;

      // Apenas Admins podem revogar recursos
      if (role !== 'administrador') {
          throw new ForbiddenException('Apenas administradores podem revogar acesso a recursos.');
      }

      const access = await this.accessRepository.findOne({
          where: { tagId, userId: targetUserId, tenantId }
      });

      if (!access) {
          throw new NotFoundException('Delegação de acesso não encontrada.');
      }

      return this.accessRepository.remove(access);
  }

  /**
   * Lista os usuários que receberam acesso delegado a uma Tag específica.
   */
  async getDelegations(tagId: string, currentUser: any) {
      const { tenantId, role } = currentUser;

      if (role !== 'administrador') {
          throw new ForbiddenException('Apenas administradores podem ver as delegações.');
      }

      const accesses = await this.accessRepository.find({
          where: { tagId, tenantId },
          relations: ['user']
      });

      return accesses.map(access => ({
          userId: access.user.id,
          name: access.user.name,
          email: access.user.email,
          grantedAt: access.createdAt
      }));
  }

  async resolveTag(identifier: string, source?: string) {
    // 1. Tenta buscar primeiro por UUID (NFC)
    let tag = await this.tagRepository.createQueryBuilder('tag')
      .leftJoinAndSelect('tag.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.phones', 'phones')
      .leftJoinAndSelect('user.addresses', 'addresses')
      .leftJoinAndSelect('user.secondaryEmails', 'secondaryEmails')
      .leftJoinAndSelect('user.links', 'links')
      .where('tag.uuid = :identifier', { identifier })
      .andWhere('tag.is_active = :isActive', { isActive: true })
      .getOne();

    // 2. Se não achar por UUID, tenta por Username (URL Amigável) - Case Insensitive
    if (!tag) {
        tag = await this.tagRepository.createQueryBuilder('tag')
          .leftJoinAndSelect('tag.user', 'user')
          .leftJoinAndSelect('user.profile', 'profile')
          .leftJoinAndSelect('user.phones', 'phones')
          .leftJoinAndSelect('user.addresses', 'addresses')
          .leftJoinAndSelect('user.secondaryEmails', 'secondaryEmails')
          .leftJoinAndSelect('user.links', 'links')
          .where('LOWER(user.username) = LOWER(:identifier)', { identifier })
          .andWhere('tag.is_active = :isActive', { isActive: true })
          .getOne();
    }

    if (!tag) {
        console.warn(`[TagsService] Tag NOT FOUND for identifier: ${identifier}`);
        return null;
    }

    console.log(`[TagsService] Resolved: ${identifier} | Found Tag ID: ${tag.id} | User: ${tag.user?.email} | Source: ${source}`);
    console.log(`[TagsService] Active Config - NFC: ${tag.nfcRedirectMode}, QR: ${tag.qrRedirectMode}`);

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

    // Determinar qual modo de redirecionamento usar baseado no source
    const redirectMode = source === 'qr' ? tag.qrRedirectMode : tag.nfcRedirectMode;
    const customUrl = source === 'qr' ? tag.qrCustomUrl : tag.nfcCustomUrl;

    return {
      id: tag.id,
      redirectMode,
      customUrl,
      user: publicUser,
      tech_type: source || 'nfc' // Default para nfc se não especificado
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

  /**
   * Atualiza as configurações de redirecionamento de uma Tag específica.
   */
  async update(tagId: string, updateData: any, currentUser: any): Promise<Tag> {
      // 1. Valida Permissão ABAC
      await this.validateAccess(tagId, currentUser);

      const tag = await this.tagRepository.findOne({ where: { id: tagId } });
      if (!tag) throw new NotFoundException('Tag não encontrada.');

      // 2. Aplica atualizações permitidas
      if (updateData.nfcRedirectMode) tag.nfcRedirectMode = updateData.nfcRedirectMode;
      if (updateData.nfcCustomUrl !== undefined) tag.nfcCustomUrl = updateData.nfcCustomUrl;
      if (updateData.qrRedirectMode) tag.qrRedirectMode = updateData.qrRedirectMode;
      if (updateData.qrCustomUrl !== undefined) tag.qrCustomUrl = updateData.qrCustomUrl;

      return this.tagRepository.save(tag);
  }
}
