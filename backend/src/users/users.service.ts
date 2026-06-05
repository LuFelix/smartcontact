// users/users.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FindManyOptions, ILike, Like, Repository, DeepPartial, IsNull } from 'typeorm';
import { CreateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/roles/entities/role.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesService } from 'src/roles/roles.service';
import { ProfilesService } from 'src/profiles/profiles.service';
import { TagsService } from 'src/tags/tags.service';
import { Tag } from 'src/tags/entities/tag.entity';
import { MembershipsService } from '../memberships/memberships.service';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class UsersService {
    // ID do Admin/Empresa padrão para isolamento inicial
    private readonly TIWEB_ID = 'aebfbdfa-0088-4bf1-9bee-36529cfc3866';

    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,

        @InjectRepository(Role)
        private readonly rolesRepository: Repository<Role>,

        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,

        private readonly rolesService: RolesService,
        private readonly profilesService: ProfilesService,
        private readonly tagsService: TagsService,
        private readonly membershipsService: MembershipsService,
        private readonly tenantsService: TenantsService,
    ) { }

    /**
     * Gera um username único a partir do nome do usuário.
     * Resolve colisões adicionando um sufixo numérico.
     */
    async generateUniqueUsername(name: string): Promise<string> {
        let baseUsername = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .replace(/[^a-z0-9]/g, "") // Mantém apenas letras e números
            .substring(0, 30); // Limita o tamanho

        if (!baseUsername) {
            baseUsername = 'user';
        }

        let username = baseUsername;
        let counter = 1;
        let exists = true;

        while (exists) {
            const user = await this.usersRepository.findOne({ where: { username } });
            if (!user) {
                exists = false;
            } else {
                username = `${baseUsername}${counter}`;
                counter++;
            }
        }

        return username;
    }

    async create(createUserDto: CreateUserDto, currentUser?: any, profilePictureUrl?: string): Promise<User> {
        let { email, cpf, password, roleId, phones, addresses, secondaryEmails, links, tags } = createUserDto as any; 
        
        // 1. Identificar ou Criar o Tenant (Empresa) e o Owner (Dono)
        let tenantId = currentUser?.tenantId;
        const ownerId = currentUser?.sub || this.TIWEB_ID;

        if (email) {
            const emailExists = await this.usersRepository.findOne({ where: { email } });
            if (emailExists) {
                throw new BadRequestException('Usuário com este e-mail já existe');
            }
        }

        // REGRAS DE INTEGRIDADE: Contas reais (com senha) DEVEM ter e-mail
        if (password && password.length > 0 && !email) {
            throw new BadRequestException('Um endereço de e-mail é obrigatório para contas com acesso ao sistema.');
        }

        if (cpf === "" || cpf === undefined) {
            cpf = null as any;
        }

        if (cpf) {
            const cpfExists = await this.usersRepository.findOne({ where: { cpf } });
            if (cpfExists) {
                throw new BadRequestException('Usuário com este CPF já existe');
            }
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        // Se não houver tenant no contexto (auto-cadastro), criamos um novo
        if (!tenantId) {
            const tenantName = `${createUserDto.name}'s Workspace`;
            const uniqueSuffix = Math.random().toString(36).substring(2, 8);
            const tenantSlug = `ws-${await this.generateUniqueUsername(createUserDto.name)}-${uniqueSuffix}`;
            const newTenant = await this.tenantsService.create(tenantName, tenantSlug);
            tenantId = newTenant.id;
        }

        let assignedRole;
        if (roleId) {
            assignedRole = await this.rolesRepository.findOne({ 
                where: [
                    { id: roleId, tenantId },
                    { id: roleId, tenantId: IsNull() }
                ] 
            });
        } else {
            const defaultRoleName = (password && password.length > 0) ? 'usuario' : 'contato';
            assignedRole = await this.rolesRepository.findOne({ where: { name: defaultRoleName } });
        }

        if (!assignedRole) {
            throw new BadRequestException('A função especificada não existe ou não pertence a esta organização.');
        }

        // Itens agora usam o tenantId identificado
        const cleanItems = (items: any[] | undefined) => items ? items.map(item => {
            const { id, ...restItem } = item;
            return { ...restItem, ownerId, tenantId };
        }) : [];

        const username = await this.generateUniqueUsername(createUserDto.name);

        const userData: DeepPartial<User> = {
            name: createUserDto.name,
            email: createUserDto.email,
            username,
            cpf: cpf as any, 
            password: hashedPassword,
            isActive: createUserDto.isActive ?? true,
            isVerified: !!currentUser?.sub,
            ownerId,
            profilePictureUrl,
            phones: cleanItems(phones),
            addresses: cleanItems(addresses),
            secondaryEmails: cleanItems(secondaryEmails),
            links: cleanItems(links),
        };

        const user = this.usersRepository.create(userData);
        const savedUser = await this.usersRepository.save(user);

        // 2. CRIAR O VÍNCULO DE MEMBERSHIP
        let profileId: string | null = null;
        
        // CRIAÇÃO AUTOMÁTICA DE PROFILE E TAG
        // Mudança Crítica: Criamos profile para QUALQUER conta que não seja 'contato',
        // mesmo que não tenha senha (membro convidado que ainda não aceitou).
        const isTeamRole = assignedRole.name?.toLowerCase() !== 'contato';

        if (isTeamRole) {
            const profile = await this.profilesService.create({
                userId: savedUser.id,
                ownerId: savedUser.ownerId!,
                tenantId: tenantId,
                profilePictureUrl: profilePictureUrl
            });
            profileId = profile.id;

            await this.tagsService.createDefaultTag(
                savedUser.id,
                savedUser.ownerId!,
                tenantId
            );
        }

        await this.membershipsService.create({
            userId: savedUser.id,
            tenantId: tenantId,
            roleId: assignedRole.id,
            profileId: profileId
        });

        // RETORNA O USUÁRIO COMPLETO COM RELAÇÕES CARREGADAS
        return this.findByEmail(savedUser.email as string) as Promise<User>;
    }

    private injectLegacyProps(user: User | null, currentUser?: any): User | null {
        if (user && user.memberships && user.memberships.length > 0) {
            let activeMembership = user.memberships[0]; // fallback
            
            // Se tiver currentUser, tenta buscar a membership no tenant desse admin/contexto
            if (currentUser?.tenantId) {
                const tenantMembership = user.memberships.find(m => m.tenantId === currentUser.tenantId);
                if (tenantMembership) {
                    activeMembership = tenantMembership;
                }
            }

            (user as any).role = activeMembership?.role;
            (user as any).tenantId = activeMembership?.tenantId;
            if (!user.profile && activeMembership?.profile) {
                user.profile = activeMembership.profile;
            }
        }
        return user;
    }

    async findByCpf(cpf: string, currentUser?: any): Promise<User | null> {
        const user = await this.usersRepository.findOne({ 
            where: { cpf }, 
            relations: ['memberships', 'memberships.role', 'memberships.profile', 'phones', 'addresses', 'tags', 'profile'] 
        });
        return this.injectLegacyProps(user, currentUser);
    }

    async findByEmail(email: string, currentUser?: any): Promise<User | null> {
        const user = await this.usersRepository.findOne({ 
            where: { email }, 
            relations: ['memberships', 'memberships.role', 'memberships.profile', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profile'] 
        });
        return this.injectLegacyProps(user, currentUser);
    }

    async findByUsername(username: string, currentUser?: any): Promise<User | null> {
        const user = await this.usersRepository.findOne({ 
            where: { username }, 
            relations: ['memberships', 'memberships.role', 'memberships.profile', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profile'] 
        });
        return this.injectLegacyProps(user, currentUser);
    }

    async findById(userId: string, currentUser?: any): Promise<User | null> {
        const baseUser = await this.usersRepository.findOne({ 
            where: { id: userId },
            relations: ['memberships']
        });
        if (!baseUser) return null;

        // Regra Multi-Tenant: Checa se o usuário logado e o alvo compartilham o mesmo tenant
        const sharedTenant = currentUser?.tenantId && baseUser.memberships?.some(m => m.tenantId === currentUser?.tenantId);
        
        if (currentUser?.tenantId && !sharedTenant && !currentUser?.isSuperAdmin) {
             throw new BadRequestException('Acesso negado: Este usuário não pertence à sua organização.');
        }

        const isOwner = baseUser.ownerId === currentUser?.sub;
        const isOwnProfile = baseUser.id === currentUser?.sub;
        const isTenantAdmin = currentUser?.role === 'administrador' && sharedTenant;
        const isSystemAdmin = currentUser?.isSuperAdmin;

        const showContacts = isSystemAdmin || isOwnProfile || isOwner || isTenantAdmin;

        const relations = showContacts
            ? ['memberships', 'memberships.role', 'memberships.tenant', 'memberships.profile', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags']
            : ['memberships', 'memberships.role', 'tags']; 

        const user = await this.usersRepository.findOne({ 
            where: { id: userId }, 
            relations 
        });

        if (user) {
            const activeMembership = user.memberships?.find(m => m.tenantId === currentUser?.tenantId) || user.memberships?.[0];
            (user as any).role = activeMembership?.role;
            (user as any).tenantId = activeMembership?.tenantId;
        }

        return user;
    }

    async findAll(page?: number, limit?: number, name?: string, email?: string, cpf?: string, currentUser?: any): Promise<{ data: User[], total: number }> {
        const skip = page && limit ? (page - 1) * limit : 0;
        const tenantId = currentUser?.tenantId || this.TIWEB_ID;
        const isSystemAdmin = currentUser?.isSuperAdmin;

        console.log(`[UsersService] Listando usuários. Tenant: ${tenantId}. SuperAdmin: ${isSystemAdmin}`);

        const queryBuilder = this.usersRepository.createQueryBuilder('user')
            .leftJoinAndSelect('user.memberships', 'membership', 'membership.tenantId = :tId', { tId: tenantId })
            .leftJoinAndSelect('membership.role', 'role')
            .leftJoinAndSelect('membership.tenant', 'tenant')
            .leftJoinAndSelect('membership.profile', 'membershipProfile')
            .leftJoinAndSelect('user.phones', 'phone')
            .leftJoinAndSelect('user.addresses', 'address')
            .leftJoinAndSelect('user.tags', 'tag')
            .leftJoinAndSelect('user.profile', 'profile')
            .orderBy('user.name', 'ASC');

        if (tenantId) {
            // Filtro de isolamento: Apenas usuários que têm vínculo com o tenant ativo
            // Mesmo para SuperAdmin, a LISTA deve ser filtrada pelo contexto atual.
            queryBuilder.andWhere(qb => {
                const subQuery = qb.subQuery()
                    .select('m.user_id')
                    .from('memberships', 'm')
                    .where('m.tenant_id = :tId', { tId: tenantId })
                    .getQuery();
                return 'user.id IN ' + subQuery;
            });
            queryBuilder.setParameter('tId', tenantId);
        }

        if (name) {
            queryBuilder.andWhere('user.name ILIKE :name', { name: `%${name}%` });
        }
        if (email) {
            queryBuilder.andWhere('user.email LIKE :email', { email: `%${email}%` });
        }
        if (cpf) {
            queryBuilder.andWhere('user.cpf LIKE :cpf', { cpf: `%${cpf}%` });
        }

        const [users, total] = await queryBuilder
            .skip(skip)
            .take(limit ?? 10)
            .getManyAndCount();

        const data = users.map(user => {
            const isOwnProfile = user.id === currentUser?.sub;
            
            // Localiza a membership específica deste tenant solicitado
            const activeMembership = user.memberships?.find(m => m.tenantId === tenantId);
            const isTenantAdmin = activeMembership && currentUser?.role === 'administrador';

            // Injeta propriedades de compatibilidade legada para o frontend baseadas no CONTEXTO
            // Priorizamos SEMPRE o que está no vínculo (Membership) para este tenant
            (user as any).role = activeMembership?.role || { id: '', name: 'usuario' };
            (user as any).tenantId = activeMembership?.tenantId || tenantId;
            
            // SOBRESCREVEMOS o profile global pelo profile do vínculo
            // Isso garante que se o vínculo for 'desligado' (profileId null), 
            // o frontend pare de ver este usuário como membro da equipe deste workspace.
            user.profile = activeMembership?.profile || undefined;

            // Filtro de Segurança ABAC: Admins e Donos vêem tudo, outros vêem básico
            if (isSystemAdmin || isOwnProfile || isTenantAdmin) {
                return user; 
            }

            // Oculta dados sensíveis para não-admins
            const { phones, addresses, secondaryEmails, links, ...basicInfo } = user;
            return basicInfo as User;
        });

        return { data, total };
    }

   async update(id: string, updateUserDto: UpdateUserDto, currentUser?: any): Promise<User> { 
        let user = await this.usersRepository.findOne({
            where: { id },
            relations: ['memberships', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profile'],
        });

        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
        }

        const isSystemAdmin = currentUser?.isSuperAdmin;
        const isTenantAdmin = currentUser?.role === 'administrador';
        const targetTenantId = currentUser?.tenantId || this.TIWEB_ID;

        // Validação de Tenant
        const sharedTenant = currentUser?.tenantId && user.memberships?.some(m => m.tenantId === currentUser?.tenantId);
        
        if (!isSystemAdmin && currentUser?.tenantId && !sharedTenant) {
             throw new BadRequestException('Acesso negado: Este usuário não pertence à sua organização.');
        }

        const isOwner = user.ownerId === currentUser?.sub;
        const isOwnProfile = user.id === currentUser?.sub;

        if (!isSystemAdmin && !isOwner && !isOwnProfile && !isTenantAdmin) {
             throw new BadRequestException('Você não tem permissão para editar este usuário.');
        }

        if (updateUserDto.email && updateUserDto.email !== user!.email) {
            const emailExists = await this.usersRepository.findOne({
                where: { email: updateUserDto.email },
            });
            if (emailExists) {
                throw new BadRequestException('Email já está em uso por outro usuário');
            }
        }

        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }

        const { roleId, phones, addresses, secondaryEmails, links, tags, ...userUpdateData } = updateUserDto;
        this.usersRepository.merge(user!, userUpdateData);

        const cleanItems = (items: any[]) => items.map(item => {
            const { id: itemId, ...rest } = item;
            const itemData = (itemId === null || itemId === undefined) ? rest : item;
            return { ...itemData, user: { id }, ownerId: user!.ownerId, tenantId: targetTenantId };
        });

        if (phones) user!.phones = cleanItems(phones) as any;
        if (addresses) user!.addresses = cleanItems(addresses) as any;
        if (secondaryEmails) user!.secondaryEmails = cleanItems(secondaryEmails) as any;
        if (links) user!.links = cleanItems(links) as any;

        // --- Lógica de Persistência de TAG Refatorada ---
        if (user!.tags && user!.tags.length > 0) {
            const activeTag = user!.tags[0];
            
            if ((updateUserDto as any).nfcRedirectMode) activeTag.nfcRedirectMode = (updateUserDto as any).nfcRedirectMode;
            if ((updateUserDto as any).nfcCustomUrl !== undefined) activeTag.nfcCustomUrl = (updateUserDto as any).nfcCustomUrl;
            if ((updateUserDto as any).qrRedirectMode) activeTag.qrRedirectMode = (updateUserDto as any).qrRedirectMode;
            if ((updateUserDto as any).qrCustomUrl !== undefined) activeTag.qrCustomUrl = (updateUserDto as any).qrCustomUrl;

            if (tags && tags.length > 0) {
                const tagData = tags[0];
                if (tagData.nfcRedirectMode) activeTag.nfcRedirectMode = tagData.nfcRedirectMode;
                if (tagData.nfcCustomUrl !== undefined) activeTag.nfcCustomUrl = tagData.nfcCustomUrl;
                if (tagData.qrRedirectMode) activeTag.qrRedirectMode = tagData.qrRedirectMode;
                if (tagData.qrCustomUrl !== undefined) activeTag.qrCustomUrl = tagData.qrCustomUrl;
            }

            await this.tagRepository.save(activeTag);
        }

        await this.usersRepository.save(user!);

        // --- ATUALIZAÇÃO DE ROLE (Via Membership) ---
        // Fazemos após o save do usuário para garantir que não haja conflitos de relação em cache
        if (updateUserDto.roleId) {
            const membership = user.memberships?.find(m => m.tenantId === targetTenantId);
            if (membership) {
                await this.membershipsService.updateRole(user.id, targetTenantId, updateUserDto.roleId);
            } else if (isTenantAdmin || isSystemAdmin) {
                await this.membershipsService.create({
                    userId: user.id,
                    tenantId: targetTenantId,
                    roleId: updateUserDto.roleId
                });
            }
        }

        // FORÇA O RECARREGAMENTO TOTAL DO BANCO para garantir que as novas memberships/roles sejam lidas
        const updatedUser = await this.findByEmail(user!.email as string, currentUser); 
        return updatedUser as User;
    }

    /**
     * Provisiona um Workspace Pessoal (Solo Tenant) para um usuário existente.
     * Usado quando um usuário que era apenas "lead/contato" faz login pela primeira vez.
     */
    async provisionPersonalWorkspace(user: User): Promise<User> {
        // "Reivindica" a conta: Se o usuário era um lead capturado por terceiros, 
        // ao fazer login ele passa a ser o dono da própria conta.
        if (user.ownerId !== user.id) {
            await this.usersRepository.update(user.id, { ownerId: user.id });
            user.ownerId = user.id;
        }

        const tenantName = `${user.name}'s Workspace`;
        const uniqueSuffix = Math.random().toString(36).substring(2, 8);
        const tenantSlug = `ws-${await this.generateUniqueUsername(user.name)}-${uniqueSuffix}`;
        const newTenant = await this.tenantsService.create(tenantName, tenantSlug);
        
        const adminRole = await this.rolesService.findOneByName('administrador');
        if (!adminRole) {
            throw new BadRequestException('Role administrador não encontrada no sistema.');
        }

        let existingProfile = await this.profilesService.findByUserId(user.id);
        if (!existingProfile) {
            existingProfile = await this.profilesService.create({
                userId: user.id,
                ownerId: user.id, // O próprio usuário é dono do seu tenant
                tenantId: newTenant.id,
                profilePictureUrl: user.profilePictureUrl || undefined
            });
        }

        // Verifica e cria a tag apenas se não existir
        const hasTag = await this.tagRepository.findOne({ where: { userId: user.id } });
        if (!hasTag) {
            await this.tagsService.createDefaultTag(
                user.id,
                user.id,
                newTenant.id
            );
        }

        await this.membershipsService.create({
            userId: user.id,
            tenantId: newTenant.id,
            roleId: adminRole.id,
            profileId: existingProfile.id
        });

        return this.findByEmail(user.email as string) as Promise<User>;
    }

    async updateProfilePicture(userId: string, pictureUrl: string): Promise<void> {
        await this.usersRepository.update(userId, { profilePictureUrl: pictureUrl });
    }

    async promoteToTeam(id: string, roleId: string, currentUser: any, email?: string): Promise<User> {
        const user = await this.usersRepository.findOne({
            where: { id },
            relations: ['memberships']
        });

        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
        }

        const isTenantAdmin = currentUser?.role === 'administrador';
        if (!currentUser?.isSuperAdmin && !isTenantAdmin) {
             throw new BadRequestException('Apenas administradores podem promover usuários.');
        }

        const targetRole = await this.rolesService.findOne(roleId, currentUser);
        if (!targetRole) {
            throw new BadRequestException('Cargo inválido.');
        }

        if (targetRole.name?.toLowerCase() === 'contato') {
            throw new BadRequestException('Não é possível promover um membro para a função de contato. Escolha um cargo de equipe.');
        }

        const targetTenantId = currentUser.tenantId || this.TIWEB_ID;

        // Se informou um novo e-mail (ou o e-mail obrigatório da promoção)
        if (email) {
            if (user.email && user.email !== email) {
                // Checa se o novo e-mail já existe em outro usuário
                const existing = await this.usersRepository.findOne({ where: { email } });
                if (existing) throw new BadRequestException('Este e-mail já está em uso por outro usuário.');
            }
            user.email = email;
            user.isVerified = true; 
        }

        if (!user.email) {
            throw new BadRequestException('Um endereço de e-mail é obrigatório para promoção à equipe.');
        }

        // Força a criação do Profile ANTES de vincular no Membership
        let existingProfile = await this.profilesService.findByUserId(user.id);
        if (!existingProfile) {
            existingProfile = await this.profilesService.create({
                userId: user.id,
                ownerId: currentUser.sub,
                tenantId: targetTenantId,
                profilePictureUrl: user.profilePictureUrl || undefined
            });
        }

        // Atualiza a Role e o Profile no membership (ou cria se não existir)
        const membership = user.memberships?.find(m => m.tenantId === targetTenantId);
        if (membership) {
            await this.membershipsService.updateRoleAndProfile(user.id, targetTenantId, targetRole.id, existingProfile.id);
        } else {
            await this.membershipsService.create({
                userId: user.id,
                tenantId: targetTenantId,
                roleId: targetRole.id,
                profileId: existingProfile.id
            });
        }

        // Força a criação da Tag (Verificação via Repositório para evitar erros de relação NOT NULL no save(user))
        const hasTag = await this.tagRepository.findOne({ where: { userId: user.id } });
        if (!hasTag) {
            await this.tagsService.createDefaultTag(
                user.id,
                currentUser.sub,
                targetTenantId
            );
        }

        // Salva as mudanças no usuário (email e isVerified)
        await this.usersRepository.save(user);

        return this.findByEmail(user.email as string, currentUser) as Promise<User>;
    }

    async createMembershipForUser(userId: string, tenantId: string, roleId: string, profileId?: string | null): Promise<void> {
        await this.membershipsService.create({
            userId,
            tenantId,
            roleId,
            profileId
        });
    }

    async demoteFromTeam(id: string, currentUser: any): Promise<void> {
        const user = await this.usersRepository.findOne({
            where: { id },
            relations: ['memberships', 'memberships.role']
        });

        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
        }

        const isTenantAdmin = currentUser?.role === 'administrador';
        if (!currentUser?.isSuperAdmin && !isTenantAdmin) {
             throw new BadRequestException('Apenas administradores podem remover usuários da equipe.');
        }

        const tenantId = currentUser.tenantId || this.TIWEB_ID;

        // 1. Rebaixa o cargo para USUARIO no workspace específico (mantém acesso ao painel como usuário padrão)
        const targetRole = await this.rolesService.findOneByName('usuario');
        if (targetRole) {
            await this.membershipsService.updateRole(user.id, tenantId, targetRole.id);
        }

        // 2. Remove o vínculo do perfil deste workspace (tirando o status de membro da equipe)
        // NÃO removemos a entidade Profile do banco, pois o usuário pode usá-la em outros tenants.
        await this.membershipsService.updateProfileId(user.id, tenantId, null);
    }

    async setVerificationData(userId: string, code: string, expires: Date): Promise<void> {
        await this.usersRepository.update(userId, {
            verificationCode: code,
            verificationExpires: expires,
        });
    }

    async markEmailAsVerified(userId: string): Promise<void> {
        await this.usersRepository.update(userId, {
            isVerified: true,
            verificationCode: null,
            verificationExpires: null,
        });
    }

    async remove(id: string, currentUser?: any): Promise<{ message: string }> { 
        const user = await this.usersRepository.findOne({ 
            where: { id },
            relations: ['memberships']
        });
        
        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
        }

        const isSystemAdmin = currentUser?.isSuperAdmin;
        const sharedTenant = currentUser?.tenantId && user.memberships?.some(m => m.tenantId === currentUser?.tenantId);

        if (!isSystemAdmin && currentUser?.tenantId && !sharedTenant) {
            throw new BadRequestException('Acesso negado: Este usuário pertence a outra organização.');
        }

        if (!isSystemAdmin && user.ownerId !== currentUser?.sub && user.id !== currentUser?.sub) {
            throw new BadRequestException('Você não tem permissão para remover este usuário.');
        }

        await this.usersRepository.delete(id);
        return { message: `Usuário com ID ${id} foi removido com sucesso.` };
    }

    /**
     * Garante que um usuário tenha ao menos uma tag vinculada (para o perfil público funcionar)
     */
    async ensureHasDefaultTag(user: User): Promise<void> {
        // Pega o tenant do primeiro membership para criar a tag
        const tenantId = user.memberships && user.memberships.length > 0 
            ? user.memberships[0].tenantId 
            : this.TIWEB_ID;
            
        await this.tagsService.createDefaultTag(user.id, user.ownerId!, tenantId);
    }

    /**
     * Migração retroativa para popular usernames de quem já existe no banco.
     */
    async migrateUsernames(): Promise<void> {
        const users = await this.usersRepository.find({ where: { username: null as any } });
        for (const user of users) {
            const username = await this.generateUniqueUsername(user.name);
            await this.usersRepository.update(user.id, { username });
        }
    }
}
