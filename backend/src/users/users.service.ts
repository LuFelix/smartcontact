import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FindManyOptions, ILike, Like, Repository, DeepPartial, IsNull, Not } from 'typeorm';
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
import { Tenant } from '../tenants/entities/tenant.entity';
import { UserResourcePermission } from './entities/user-resource-permission.entity';

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);
    // ID do Admin/Empresa padrão para isolamento inicial
    private readonly TIWEB_ID = 'aebfbdfa-0088-4bf1-9bee-36529cfc3866';

    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,

        @InjectRepository(Role)
        private readonly rolesRepository: Repository<Role>,

        @InjectRepository(Tag)
        private readonly tagRepository: Repository<Tag>,

        @InjectRepository(UserResourcePermission)
        private readonly userResourcePermissionRepository: Repository<UserResourcePermission>,

        @InjectRepository(Tenant)
        private readonly tenantsRepository: Repository<Tenant>,

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
        // Se houver sub no contexto, o ownerId é quem está criando.
        // Se for auto-cadastro (sem sub), o ownerId SERÁ o id do próprio usuário após o save.
        // Por enquanto, usamos null se for auto-cadastro para sabermos que precisamos atualizar depois.
        let ownerId = currentUser?.sub || null;

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
        let isNewTenant = false;
        if (!tenantId) {
            const tenantName = `${createUserDto.name}'s Workspace`;
            const uniqueSuffix = Math.random().toString(36).substring(2, 8);
            const tenantSlug = `ws-${await this.generateUniqueUsername(createUserDto.name)}-${uniqueSuffix}`;
            const newTenant = await this.tenantsService.create(tenantName, tenantSlug);
            tenantId = newTenant.id;
            isNewTenant = true;
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

        // Se for auto-cadastro (ownerId era null), o usuário agora é o dono de si mesmo
        if (!ownerId) {
            ownerId = savedUser.id;
            await this.usersRepository.update(savedUser.id, { ownerId });
            savedUser.ownerId = ownerId;

            // CORREÇÃO DE ISOLAMENTO DE POSSE: Itens relacionados foram salvos
            // com ownerId: null durante cascade do save. Agora que o ownerId foi
            // resolvido, atualizamos os itens para evitar contaminação cruzada.
            if (phones || addresses || secondaryEmails || links) {
                const recordWithItems = await this.usersRepository.findOne({
                    where: { id: savedUser.id },
                    relations: ['phones', 'addresses', 'secondaryEmails', 'links']
                });
                if (recordWithItems) {
                    let needsSave = false;
                    if (recordWithItems.phones?.length) {
                        recordWithItems.phones.forEach(p => { p.ownerId = ownerId; });
                        needsSave = true;
                    }
                    if (recordWithItems.addresses?.length) {
                        recordWithItems.addresses.forEach(a => { a.ownerId = ownerId; });
                        needsSave = true;
                    }
                    if (recordWithItems.secondaryEmails?.length) {
                        recordWithItems.secondaryEmails.forEach(e => { e.ownerId = ownerId; });
                        needsSave = true;
                    }
                    if (recordWithItems.links?.length) {
                        recordWithItems.links.forEach(l => { l.ownerId = ownerId; });
                        needsSave = true;
                    }
                    if (needsSave) {
                        await this.usersRepository.save(recordWithItems);
                    }
                }
            }
        }

        // Se criamos um novo tenant, definimos o ownerId do tenant
        if (isNewTenant && tenantId) {
            await this.tenantsService.update(tenantId, { ownerId: savedUser.id });
        }

        // 2. CRIAR O VÍNCULO DE MEMBERSHIP
        let profileId: string | null = null;
        
        // CRIAÇÃO AUTOMÁTICA DE PROFILE E TAG
        // Mudança Crítica: Criamos profile para QUALQUER conta que não seja 'contato',
        // mesmo que não tenha senha (membro convidado que ainda não aceitou).
        const isTeamRole = assignedRole.name?.toLowerCase() !== 'contato';

        if (isTeamRole) {
            // Verifica se o perfil já existe no tenant (idempotência)
            let profile = await this.profilesService.findByUserIdAndTenant(savedUser.id, tenantId);
            if (!profile) {
                profile = await this.profilesService.create({
                    userId: savedUser.id,
                    ownerId: ownerId as string, // Usa o ownerId resolvido (quem convidou ou o próprio usuário)
                    tenantId: tenantId,
                    profilePictureUrl: profilePictureUrl
                });
            }
            profileId = profile.id;

            // Verifica se a tag já existe (idempotência)
            const hasTag = await this.tagRepository.findOne({ where: { userId: savedUser.id, tenantId } });
            if (!hasTag) {
                await this.tagsService.createDefaultTag(
                    savedUser.id,
                    ownerId as string,
                    tenantId
                );
            }
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
            if (activeMembership?.profile) {
                (user as any).profile = activeMembership.profile;
            }
        }
        return user;
    }

    async findByCpf(cpf: string, currentUser?: any): Promise<User | null> {
        const user = await this.usersRepository.findOne({ 
            where: { cpf }, 
            relations: ['memberships', 'memberships.role', 'memberships.profile', 'phones', 'addresses', 'tags', 'profiles'] 
        });
        return this.injectLegacyProps(user, currentUser);
    }

    async findByEmail(email: string, currentUser?: any): Promise<User | null> {
        const emailNormalized = email?.trim().toLowerCase();
        const user = await this.usersRepository.findOne({ 
            where: { email: emailNormalized }, 
            relations: ['memberships', 'memberships.role', 'memberships.tenant', 'memberships.profile', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profiles'] 
        });
        return this.injectLegacyProps(user, currentUser);
    }

    async findByUsername(username: string, currentUser?: any): Promise<User | null> {
        const user = await this.usersRepository.findOne({ 
            where: { username }, 
            relations: ['memberships', 'memberships.role', 'memberships.profile', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profiles'] 
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
            // O profile contextual é o da membership ativa neste tenant
            // FALLBACK: profile da membership ou undefined
            (user as any).profile = activeMembership?.profile || undefined;

            const isTenantOwner = activeMembership 
                && activeMembership.role?.name === 'administrador' 
                && activeMembership.tenant?.ownerId === user.id;
            (user as any).isTenantOwner = isTenantOwner;
        }

        return user;
    }

    async findAll(page?: number, limit?: number, name?: string, email?: string, cpf?: string, currentUser?: any, excludeRoles?: string[]): Promise<{ data: User[], total: number }> {
        const skip = page && limit ? (page - 1) * limit : 0;
        const tenantId = currentUser?.tenantId || this.TIWEB_ID;
        const isSystemAdmin = currentUser?.isSuperAdmin;

        console.log(`[UsersService] Listando usuários. Tenant: ${tenantId}. SuperAdmin: ${isSystemAdmin}`);

        // SEGURANÇA: Se não for SuperAdmin, verifica se o usuário tem membership no tenant solicitado
        if (!isSystemAdmin && currentUser?.sub) {
            const hasMembership = await this.membershipsService.findByUserAndTenant(currentUser.sub, tenantId);
            if (!hasMembership) {
                console.warn(`[UsersService] Bloqueio de acesso: Usuário ${currentUser.sub} tentou listar dados do tenant ${tenantId} sem possuir vínculo.`);
                throw new ForbiddenException('Acesso negado: Você não pertence a esta organização.');
            }
        }

        const queryBuilder = this.usersRepository.createQueryBuilder('user')
            .leftJoinAndSelect('user.memberships', 'membership', 'membership.tenantId = :tId', { tId: tenantId })
            .leftJoinAndSelect('membership.role', 'role')
            .leftJoinAndSelect('membership.tenant', 'tenant')
            .leftJoinAndSelect('membership.profile', 'membershipProfile')
            .leftJoinAndSelect('user.phones', 'phone')
            .leftJoinAndSelect('user.addresses', 'address')
            .leftJoinAndSelect('user.tags', 'tag', 'tag.tenantId = :tId', { tId: tenantId })
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

        if (excludeRoles && excludeRoles.length > 0) {
            queryBuilder.andWhere('role.name NOT IN (:...excludeRoles)', { excludeRoles });
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
            
            // O profile contextual é o da membership ativa neste tenant
            // Se a membership não tiver profile (profileId null), o usuário
            // não é mais membro da equipe e não deve ter badge de Equipe.
            (user as any).profile = activeMembership?.profile || undefined;

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
            relations: ['memberships', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profiles'],
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

        // CHECAGEM DE IDEMPOTÊNCIA: Verifica se já não foi criado um workspace pessoal em uma requisição paralela
        // (Isso evita a criação de 6 workspaces se houver 6 requests simultâneos no primeiro login)
        // Usa tenant.ownerId como fonte de verdade (escritura), não profile.ownerId.
        const updatedUserCheck = await this.findByEmail(user.email as string);
        const hasPersonalWorkspace = updatedUserCheck?.ownerId === user.id && 
                                   updatedUserCheck?.memberships?.some(m => m.tenant?.ownerId === user.id);
        
        if (hasPersonalWorkspace) {
            console.log(`[UsersService] Workspace pessoal já identificado para ${user.email}, abortando criação redundante.`);
            return updatedUserCheck as User;
        }

        const tenantName = `${user.name}'s Workspace`;
        
        // TRAVA CONTRA RACE CONDITION: Utilizamos uma slug determinística baseada no ID do usuário.
        // Como a coluna 'slug' tem restrição UNIQUE no PostgreSQL, requisições concorrentes 
        // tentarão inserir o mesmo valor e o banco rejeitará (erro 23505), evitando Workspaces duplicados.
        const tenantSlug = `ws-${user.id}`.substring(0, 50);

        let newTenant;
        try {
            newTenant = await this.tenantsService.create(tenantName, tenantSlug, user.id);
        } catch (error: any) {
            // Código 23505: unique_violation no PostgreSQL
            if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
                console.log(`[UsersService] Race Condition Evitada: O Tenant pessoal de ${user.email} já está sendo criado por outra requisição concorrente.`);
                // Pequeno delay para garantir que a requisição vencedora termine de montar as memberships e tags
                await new Promise(resolve => setTimeout(resolve, 500));
                return this.findByEmail(user.email as string) as Promise<User>;
            }
            throw error;
        }
        
        const adminRole = await this.rolesService.findOneByName('administrador');
        if (!adminRole) {
            throw new BadRequestException('Role administrador não encontrada no sistema.');
        }

        let existingProfile = await this.profilesService.findByUserIdAndTenant(user.id, newTenant.id);
        if (!existingProfile) {
            existingProfile = await this.profilesService.create({
                userId: user.id,
                ownerId: user.id,
                tenantId: newTenant.id,
                profilePictureUrl: user.profilePictureUrl || undefined
            });
        }
        // NOTA: NÃO mutamos existingProfile.ownerId aqui.
        // O Profile é global (OneToOne com User) e compartilhado entre tenants.
        // Sobrescrever o ownerId corromperia a cadeia de posse em outros workspaces.

        // Verifica e cria a tag apenas se não existir NESTE tenant
        const hasTag = await this.tagRepository.findOne({ where: { userId: user.id, tenantId: newTenant.id } });
        if (!hasTag) {
            await this.tagsService.createDefaultTag(
                user.id,
                user.id,
                newTenant.id
            );
        }

        // CRIA A MEMBERSHIP COMO ADMINISTRADOR NO WORKSPACE PESSOAL
        await this.membershipsService.create({
            userId: user.id,
            tenantId: newTenant.id,
            roleId: adminRole.id,
            profileId: existingProfile.id
        });

        // CHECAGEM DEFENSIVA: Promove membership 'contato' para administrador se necessário
        const existingMembership = await this.membershipsService.findByUserAndTenant(user.id, newTenant.id);
        if (existingMembership) {
            const existingRole = await this.rolesService.findOne(existingMembership.roleId);
            if (!existingRole || existingRole.name === 'contato' || !existingMembership.profileId) {
                console.log(`[UsersService] Promovendo membership de ${user.email} no tenant ${newTenant.id} de '${existingRole?.name}' para 'administrador'.`);
                await this.membershipsService.updateRoleAndProfile(user.id, newTenant.id, adminRole.id, existingProfile.id);
            }
        }

        // GARANTIA DE PROFILE: Verifica se o dono do tenant tem profileId vinculado à membership
        // (defesa contra race condition onde membership foi criada sem profileId)
        const membershipCheck = await this.membershipsService.findByUserAndTenant(user.id, newTenant.id);
        if (membershipCheck && !membershipCheck.profileId) {
            console.log(`[UsersService] Garantindo profileId na membership de ${user.email} no tenant ${newTenant.id}.`);
            await this.membershipsService.updateProfileId(user.id, newTenant.id, existingProfile.id);
        }

        // OPTIMISTIC LOCK: Atualiza ownerId do usuário de forma atômica, apenas se ainda não for do próprio.
        // ownerId = user.id pode vir de contact sync (usuário já é dono de si, mas sem workspace pessoal).
        // Nesse caso, o lock é pulado — o slug determinístico ws-{userId} + UNIQUE constraint já previne duplicatas.
        // Se o affected for 0, significa que outra thread já venceu a corrida e definiu o ownerId.
        if (user.ownerId !== user.id) {
            const updateResult = await this.usersRepository.update({ id: user.id, ownerId: Not(user.id) }, { ownerId: user.id });
            if (updateResult.affected === 0) {
                this.logger.warn(`[Race Condition] Usuário ${user.email} já recebeu um ownerId em outra thread. Limpando recursos duplicados em memória.`);
                await this.membershipsService.remove(user.id, newTenant.id);
                await this.profilesService.removeByUserIdAndTenant(user.id, newTenant.id);
                await this.tenantsRepository.delete(newTenant.id);
                return this.findByEmail(user.email as string) as Promise<User>;
            }
        }

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
        let existingProfile = await this.profilesService.findByUserIdAndTenant(user.id, targetTenantId);
        if (!existingProfile) {
            existingProfile = await this.profilesService.create({
                userId: user.id,
                ownerId: user.id,
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

        // Força a criação da Tag específica para este Workspace
        // (Verificação via Repositório para evitar erros de relação NOT NULL no save(user))
        const hasTag = await this.tagRepository.findOne({ where: { userId: user.id, tenantId: targetTenantId } });
        if (!hasTag) {
            console.log(`[UsersService] Criando tag padrão para o usuário ${user.id} no tenant ${targetTenantId}`);
            await this.tagsService.createDefaultTag(
                user.id,
                user.id,
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
        console.log(`[UsersService] Iniciando rebaixamento de membro ${id} no tenant ${tenantId}`);

        // 1. Rebaixa o cargo para CONTATO no workspace específico (remove do painel de equipe, mantém no fichário)
        // Buscamos a role 'contato' explicitamente
        const targetRole = await this.rolesService.findOneByName('contato');
        
        if (targetRole) {
            console.log(`[UsersService] Rebaixando para a role: ${targetRole.name} (ID: ${targetRole.id})`);
            await this.membershipsService.updateRole(user.id, tenantId, targetRole.id);
        } else {
            console.error(`[UsersService] ERRO CRÍTICO: Role 'contato' não encontrada para rebaixamento.`);
            throw new BadRequestException('Erro interno: Role de segurança "contato" não encontrada.');
        }

        // 2. Remove o vínculo do perfil deste workspace (tirando o status de membro da equipe)
        // Isso faz com que o usuário suma da listagem de "Equipe" mas continue no banco e no Workspace.
        console.log(`[UsersService] Removendo profileId do vínculo membership no tenant ${tenantId}`);
        await this.membershipsService.updateProfileId(user.id, tenantId, null);

        // 3. Remove a Tag deste usuário vinculada a este Tenant específico
        // Isso garante que ele não tenha um cartão de visita ativo para esta empresa após sair da equipe.
        console.log(`[UsersService] Removendo Tag vinculada ao tenant ${tenantId} para o usuário ${id}`);
        await this.tagRepository.delete({ userId: id, tenantId: tenantId });
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
            
        const hasTag = await this.tagRepository.findOne({ where: { userId: user.id, tenantId } });
        if (!hasTag) {
            await this.tagsService.createDefaultTag(user.id, user.ownerId!, tenantId);
        }
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

    /**
     * Lista IDs das tags/recursos delegados a um usuário no workspace atual
     */
    async getUserTags(userId: string, currentUser: any): Promise<string[]> {
        const tenantId = currentUser?.tenantId || this.TIWEB_ID;
        
        const permissions = await this.userResourcePermissionRepository.find({
            where: { userId, tenantId }
        });

        return permissions.map(p => p.tagId);
    }

    /**
     * Atualiza tags/recursos delegados a um usuário no workspace atual em lote
     */
    async updateUserTags(userId: string, tagIds: string[], currentUser: any): Promise<void> {
        const tenantId = currentUser?.tenantId || this.TIWEB_ID;
        const isTenantAdmin = currentUser?.role === 'administrador';
        const isSystemAdmin = currentUser?.isSuperAdmin;

        if (!isSystemAdmin && !isTenantAdmin) {
            throw new ForbiddenException('Apenas administradores podem gerenciar recursos delegados.');
        }

        // Limpa permissões antigas neste tenant
        await this.userResourcePermissionRepository.delete({ userId, tenantId });

        // Insere as novas se houver
        if (tagIds && tagIds.length > 0) {
            const newPermissions = tagIds.map(tagId => this.userResourcePermissionRepository.create({
                userId,
                tagId,
                tenantId
            }));
            await this.userResourcePermissionRepository.save(newPermissions);
        }
    }
}
