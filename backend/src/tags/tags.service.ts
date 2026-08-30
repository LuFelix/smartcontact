import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tag, RedirectMode, TechnologyType, ApplicationType } from './entities/tag.entity';
import { UserTagAccess } from './entities/user-tag-access.entity';
import { User } from 'src/users/entities/user.entity';
import { Profile } from 'src/profiles/entities/profile.entity';
import { Tenant } from 'src/tenants/entities/tenant.entity';
import { InteractionLogsService } from 'src/interaction-logs/interaction-logs.service';
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
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    private readonly interactionLogsService: InteractionLogsService,
  ) {}

  async create(createTagDto: CreateTagDto, currentUser: any, tenantId: string): Promise<Tag> {
      const { sub: userId } = currentUser;

      if (!tenantId) {
          throw new BadRequestException('Tenant ID (Workspace) não fornecido no cabeçalho.');
      }

      // Sanitização do UID: Se vier string vazia ou só espaços, vira null
      const sanitizedUid = createTagDto.uid?.trim() || null;

      // Verificar se UID já existe para este tenant (Apenas se for fornecido e não nulo)
      if (sanitizedUid) {
          const existing = await this.tagRepository.findOne({
              where: { uid: sanitizedUid, tenantId }
          });

          if (existing) {
              throw new BadRequestException('Já existe um recurso cadastrado com este UID neste Workspace.');
          }
      }

      const handle = await this.generateHandle(userId, tenantId);
      const tag = this.tagRepository.create({
          ...createTagDto,
          uid: sanitizedUid,
          uuid: uuidv4(),
          handle,
          tenantId,
          ownerId: userId,
          userId,
          isActive: true,
          isResource: true // Marcamos explicitamente como recurso de workspace
      });

      return this.tagRepository.save(tag);
  }

  async createDefaultTag(userId: string, ownerId: string, tenantId: string): Promise<Tag> {
      const existingTag = await this.tagRepository.findOne({ where: { userId, tenantId } });
      if (existingTag) {
          return existingTag;
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      const handle = await this.generateHandle(userId, tenantId);
      const tag = this.tagRepository.create({
          uuid: uuidv4(),
          handle,
          userId,
          ownerId,
          tenantId,
          nfcRedirectMode: RedirectMode.PROFILE,
          qrRedirectMode: RedirectMode.PROFILE,
          isActive: true,
          technologyType: TechnologyType.QR_CODE,
          applicationType: ApplicationType.REDIRECT,
          name: `Cartão: ${user?.name || 'Novo Membro'}`,
          isResource: false
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

      // 2. Restrição ABAC: Membros comuns vêem apenas as tags delegadas a eles. Admin/Owner vê tudo.
      const isAdminOrOwner = currentUser.role === 'administrador' || currentUser.role === 'owner';
      
      const whereCondition: any = { tenantId, isResource: true };
      
      if (!isAdminOrOwner) {
          whereCondition.userId = currentUser.sub;
      }

      return this.tagRepository.find({ 
          where: whereCondition,
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

  private async generateHandle(userId: string, tenantId: string): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId }, select: ['username', 'id'] });
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId }, select: ['slug'] });

    const username = user?.username || `user-${userId.slice(0, 6)}`;
    const slug = tenant?.slug || `t-${tenantId.slice(0, 6)}`;
    const baseHandle = `${username}-${slug}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

    let handle = baseHandle;
    let counter = 2;
    while (await this.tagRepository.findOne({ where: { handle }, select: ['id'] })) {
      handle = `${baseHandle}-${counter}`;
      counter++;
    }

    return handle;
  }

  async resolveTag(identifier: string, source?: string, metadata?: { ip: string; userAgent: string }) {
    // 1. Tenta por HANDLE primeiro (identificador amigável por tenant)
    let tag = await this.tagRepository.createQueryBuilder('tag')
      .leftJoinAndSelect('tag.user', 'user')
      .leftJoinAndSelect('user.phones', 'phones')
      .leftJoinAndSelect('user.addresses', 'addresses')
      .leftJoinAndSelect('user.secondaryEmails', 'secondaryEmails')
      .leftJoinAndSelect('user.links', 'links')
      .where('tag.handle = :identifier', { identifier })
      .andWhere('tag.is_active = :isActive', { isActive: true })
      .getOne();

    // 2. Se não achar por HANDLE, tenta por UUID (NFC/RFID)
    if (!tag) {
        tag = await this.tagRepository.createQueryBuilder('tag')
          .leftJoinAndSelect('tag.user', 'user')
          .leftJoinAndSelect('user.phones', 'phones')
          .leftJoinAndSelect('user.addresses', 'addresses')
          .leftJoinAndSelect('user.secondaryEmails', 'secondaryEmails')
          .leftJoinAndSelect('user.links', 'links')
          .where('tag.uuid = :identifier', { identifier })
          .andWhere('tag.is_active = :isActive', { isActive: true })
          .getOne();
    }

    // 3. Se não achar por HANDLE nem UUID, tenta por Username (Legado - deprecado)
    if (!tag) {
        tag = await this.tagRepository.createQueryBuilder('tag')
          .leftJoinAndSelect('tag.user', 'user')
          .leftJoinAndSelect('user.phones', 'phones')
          .leftJoinAndSelect('user.addresses', 'addresses')
          .leftJoinAndSelect('user.secondaryEmails', 'secondaryEmails')
          .leftJoinAndSelect('user.links', 'links')
          .where('LOWER(user.username) = LOWER(:identifier)', { identifier })
          .andWhere('tag.is_active = :isActive', { isActive: true })
          .andWhere('tag.isResource = :isResource', { isResource: false })
          .getOne();
    }

    if (!tag) {
        console.warn(`[TagsService] Tag NOT FOUND for identifier: ${identifier}`);
        return null;
    }

    console.log(`[TagsService] Resolved: ${identifier} | Found Tag ID: ${tag.id} | User: ${tag.user?.email} | Source: ${source}`);
    console.log(`[TagsService] Active Config - NFC: ${tag.nfcRedirectMode}, QR: ${tag.qrRedirectMode}`);

    // LOG VISIT: Registra a visita para analytics
    if (metadata) {
        try {
            await this.interactionLogsService.logVisit(tag.id, {
                ip: metadata.ip,
                userAgent: metadata.userAgent,
                source: source || 'link',
                tenantId: tag.tenantId
            });
        } catch (err) {
            console.warn(`[TagsService] Falha ao registrar visita: ${err}`);
        }
    }

    // Filter sensitive data
    const { user } = tag;
    // Carrega o profile específico deste Tenant (cada tag pertence a um tenant)
    let profile = await this.profileRepository.findOne({ 
        where: { userId: user.id, tenantId: tag.tenantId } 
    });

    // FALLBACK: Se o perfil do Workspace estiver em branco/nulo, carrega o perfil pessoal (Solo Tenant) do proprietário da tag
    if (!profile) {
        // Encontra o Solo Tenant pertencente ao usuário
        const personalTenant = await this.tenantRepository.findOne({
            where: { ownerId: user.id }
        });
        if (personalTenant) {
            profile = await this.profileRepository.findOne({
                where: { userId: user.id, tenantId: personalTenant.id }
            });
        }
    }

    const publicUser = {
      name: user.name,
      email: user.email,
      profile,
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
      handle: tag.handle,
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

      // Self-ownership bypass: dono sempre pode acessar o próprio recurso
      if (tag.ownerId === userId) return;

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
      if (updateData.uid !== undefined) {
          // Sanitização do UID: Se vier string vazia ou só espaços, vira null
          const sanitizedUid = updateData.uid?.trim() || null;

          // Verificar se UID já existe para este tenant (se mudou e se não é nulo)
          if (sanitizedUid !== tag.uid) {
              if (sanitizedUid) {
                  const existing = await this.tagRepository.findOne({
                      where: { uid: sanitizedUid, tenantId }
                  });
                  if (existing) {
                      throw new BadRequestException('Já existe um recurso cadastrado com este UID neste Workspace.');
                  }
              }
              tag.uid = sanitizedUid;
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

      // HANDLE: Permite admin customizar, com validação de unicidade
      if (updateData.handle !== undefined) {
          const sanitizedHandle = updateData.handle?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') || null;
          if (sanitizedHandle && sanitizedHandle !== tag.handle) {
              const existing = await this.tagRepository.findOne({ where: { handle: sanitizedHandle } });
              if (existing) {
                  throw new BadRequestException('Este handle já está em uso por outra tag.');
              }
              tag.handle = sanitizedHandle;
          }
      }

      return this.tagRepository.save(tag);
  }
}
