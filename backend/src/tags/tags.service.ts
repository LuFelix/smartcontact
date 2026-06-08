import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tag, RedirectMode, TechnologyType, ApplicationType } from './entities/tag.entity';
import { UserTagAccess } from './entities/user-tag-access.entity';
import { User } from 'src/users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(UserTagAccess)
    private readonly accessRepository: Repository<UserTagAccess>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createTagDto: CreateTagDto, currentUser: any, tenantId: string): Promise<Tag> {
      const { sub: userId } = currentUser;

      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

      // Verificar se UID já existe para este tenant (Apenas se for fornecido)
      if (createTagDto.uid) {
          const existing = await this.tagRepository.findOne({
              where: { uid: createTagDto.uid, tenantId }
          });

          if (existing) {
              throw new BadRequestException('Já existe um recurso cadastrado com este UID neste Workspace.');
          }
      }

      const tag = this.tagRepository.create({
          ...createTagDto,
          uuid: uuidv4(),
          tenantId,
          ownerId: userId,
          userId,
          isActive: true,
          isResource: true // Marcamos explicitamente como recurso de workspace
      });

      return this.tagRepository.save(tag);
  }

  async createDefaultTag(userId: string, ownerId: string, tenantId: string): Promise<Tag> {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const tag = this.tagRepository.create({
          uuid: uuidv4(),
          userId,
          ownerId,
          tenantId,
          nfcRedirectMode: RedirectMode.PROFILE,
          qrRedirectMode: RedirectMode.PROFILE,
          isActive: true,
          technologyType: TechnologyType.QR_CODE,
          applicationType: ApplicationType.REDIRECT,
          name: `Cartão: ${user?.name || 'Novo Membro'}`,
          isResource: false // Tags pessoais NÃO são recursos genéricos
      });
      return this.tagRepository.save(tag);
  }

  /**
   * Lista apenas os recursos genéricos (ativos) do Workspace.
   */
  async findAll(currentUser: any, tenantId: string): Promise<Tag[]> {
      const { isSuperAdmin } = currentUser;

      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

      // 1. Super Admin vê tudo globalmente (recursos de todos)
      // Porém, como estamos filtrando por tenantId, ele verá apenas os do tenant solicitado.
      if (isSuperAdmin) {
          return this.tagRepository.find({ 
              where: { tenantId, isResource: true },
              relations: ['user'] 
          });
      }

      // 2. Admin do Tenant vê apenas os recursos do seu workspace
      return this.tagRepository.find({ 
          where: { tenantId, isResource: true },
          relations: ['user']
      });
  }

  /**
   * Lista os recursos do Workspace que foram especificamente delegados ao usuário logado.
   */
  async findMyDelegated(currentUser: any, tenantId: string): Promise<Tag[]> {
      const { sub: userId } = currentUser;

      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

      return this.tagRepository.createQueryBuilder('tag')
          .innerJoin('user_resources_permissions', 'urp', 'tag.id = urp.tag_id')
          .leftJoinAndSelect('tag.user', 'user')
          .where('urp.user_id = :userId', { userId })
          .andWhere('urp.tenant_id = :tenantId', { tenantId })
          .andWhere('tag.tenantId = :tenantId', { tenantId })
          .andWhere('tag.isResource = :isResource', { isResource: true })
          .getMany();
  }

  /**
   * Delega o acesso de uma Tag a um sub-usuário (ex: dar uma turma para um Tutor).
   */
  async grantAccess(tagId: string, targetUserId: string, currentUser: any, tenantId: string) {
      const { sub: granterId, role } = currentUser;

      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

      // Apenas Admins podem delegar recursos
      if (role !== 'administrador') {
          throw new ForbiddenException('Apenas administradores podem delegar acesso a recursos.');
      }

      const tag = await this.tagRepository.findOne({ where: { id: tagId, tenantId } });
      if (!tag) {
          throw new NotFoundException('Recurso não encontrado neste ambiente.');
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
  async revokeAccess(tagId: string, targetUserId: string, currentUser: any, tenantId: string) {
      const { role } = currentUser;

      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

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
  async getDelegations(tagId: string, currentUser: any, tenantId: string) {
      const { role } = currentUser;

      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

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
  async validateAccess(tagId: string, currentUser: any, tenantId: string): Promise<void> {
      const { sub: userId, role, isSuperAdmin } = currentUser;

      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

      if (isSuperAdmin) return;

      const tag = await this.tagRepository.findOne({ where: { id: tagId } });
      if (!tag) throw new NotFoundException('Recurso não encontrado.');

      // Bloqueio Multi-Tenant usando o header explícito
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
          throw new ForbiddenException('Você não tem permissão para acessar este recurso.');
      }
  }

  /**
   * Remove uma Tag (Apenas Admin).
   */
  async remove(tagId: string, currentUser: any, tenantId: string): Promise<void> {
      const { role } = currentUser;

      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

      if (role !== 'administrador') {
          throw new ForbiddenException('Apenas administradores podem remover recursos do estoque.');
      }

      const tag = await this.tagRepository.findOne({ where: { id: tagId, tenantId } });
      if (!tag) {
          throw new NotFoundException('Recurso não encontrado no seu ambiente.');
      }

      await this.tagRepository.remove(tag);
  }

  /**
   * Atualiza as configurações de uma Tag específica.
   */
  async update(tagId: string, updateData: UpdateTagDto, currentUser: any, tenantId: string): Promise<Tag> {
      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

      // 1. Valida Permissão ABAC
      await this.validateAccess(tagId, currentUser, tenantId);

      const tag = await this.tagRepository.findOne({ where: { id: tagId } });
      if (!tag) throw new NotFoundException('Recurso não encontrado.');

      // 2. Aplica atualizações permitidas
      if (updateData.uid) {
          // Verificar se UID já existe para este tenant (se mudou)
          if (updateData.uid !== tag.uid) {
              const existing = await this.tagRepository.findOne({
                  where: { uid: updateData.uid, tenantId }
              });
              if (existing) {
                  throw new BadRequestException('Já existe um recurso cadastrado com este UID neste Workspace.');
              }
              tag.uid = updateData.uid;
          }
      }

      if (updateData.name) tag.name = updateData.name;
      if (updateData.technologyType) tag.technologyType = updateData.technologyType;
      if (updateData.applicationType) tag.applicationType = updateData.applicationType;
      if (updateData.value !== undefined) tag.value = updateData.value;

      if (updateData.nfcRedirectMode) tag.nfcRedirectMode = updateData.nfcRedirectMode;
      if (updateData.nfcCustomUrl !== undefined) tag.nfcCustomUrl = updateData.nfcCustomUrl;
      if (updateData.qrRedirectMode) tag.qrRedirectMode = updateData.qrRedirectMode;
      if (updateData.qrCustomUrl !== undefined) tag.qrCustomUrl = updateData.qrCustomUrl;

      return this.tagRepository.save(tag);
  }
}
