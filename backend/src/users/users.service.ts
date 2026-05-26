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

@Injectable()
export class UsersService {
    // ID do Admin/Empresa padrão para isolamento inicial
    private readonly TIWEB_ID = 'aebfbdfa-0088-4bf1-9bee-36529cfc3866';

    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,

        @InjectRepository(Role)
        private readonly rolesRepository: Repository<Role>,

        private readonly rolesService: RolesService,
        private readonly profilesService: ProfilesService,
        private readonly tagsService: TagsService,
    ) { }

    /**
     * Gera um username único a partir do nome do usuário.
     * Resolve colisões adicionando um sufixo numérico.
     */
    async generateUniqueUsername(name: string): Promise<string> {
        const baseUsername = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .replace(/[^a-z0-9]/g, "") // Mantém apenas letras e números
            .substring(0, 30); // Limita o tamanho

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
        
        // 1. Identificar o Tenant (Empresa) e o Owner (Dono)
        const tenantId = currentUser?.tenantId || this.TIWEB_ID;
        const ownerId = currentUser?.sub || this.TIWEB_ID;

        const emailExists = await this.usersRepository.findOne({ where: { email } });
        if (emailExists) {
            throw new BadRequestException('Usuário com este e-mail já existe');
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

        const hashedPassword = await bcrypt.hash(password || '', 10);

        let assignedRole;
        if (roleId) {
            // SEGURANÇA: Busca a role garantindo que ela seja Global (tenantId null) 
            // OU que pertença ao mesmo Tenant do criador.
            assignedRole = await this.rolesRepository.findOne({ 
                where: [
                    { id: roleId, tenantId },
                    { id: roleId, tenantId: IsNull() }
                ] 
            });
        } else {
            assignedRole = await this.rolesRepository.findOne({ where: { name: 'colaborador' } });
        }

        if (!assignedRole) {
            throw new BadRequestException('A função especificada não existe ou não pertence a esta organização.');
        }

        const cleanItems = (items: any[] | undefined) => items ? items.map(item => {
            const { id, ...restItem } = item;
            return { ...restItem, ownerId, tenantId };
        }) : [];

        // GERA USERNAME AUTOMÁTICO NA CRIAÇÃO
        const username = await this.generateUniqueUsername(createUserDto.name);

        const userData: DeepPartial<User> = {
            name: createUserDto.name,
            email: createUserDto.email,
            username,
            cpf: cpf as any, 
            password: hashedPassword,
            isActive: createUserDto.isActive ?? true,
            role: assignedRole,
            ownerId,
            tenantId,
            phones: cleanItems(phones),
            addresses: cleanItems(addresses),
            secondaryEmails: cleanItems(secondaryEmails),
            links: cleanItems(links),
        };

        const user = this.usersRepository.create(userData);
        const savedUser = await this.usersRepository.save(user);

        // CRIAÇÃO AUTOMÁTICA DE PROFILE E TAG (Apenas para Contas Reais/SaaS)
        const isRealAccount = !!createUserDto.password && createUserDto.password.length > 0;

        if (isRealAccount) {
            await this.profilesService.create({
                userId: savedUser.id,
                ownerId: savedUser.ownerId!,
                tenantId: savedUser.tenantId!,
                profilePictureUrl: profilePictureUrl
            });

            await this.tagsService.createDefaultTag(
                savedUser.id,
                savedUser.ownerId!,
                savedUser.tenantId!
            );
        }

        // RETORNA O USUÁRIO COMPLETO COM RELAÇÕES CARREGADAS
        return this.findByEmail(savedUser.email) as Promise<User>;
    }

    async findByCpf(cpf: string): Promise<User | null> {
        return this.usersRepository.findOne({ 
            where: { cpf }, 
            relations: ['role', 'phones', 'addresses', 'tags', 'profile'] 
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ 
            where: { email }, 
            relations: ['role', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profile'] 
        });
    }

    async findByUsername(username: string): Promise<User | null> {
        return this.usersRepository.findOne({ 
            where: { username }, 
            relations: ['role', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profile'] 
        });
    }

    async findById(userId: string, currentUser?: any): Promise<User | null> {
        const baseUser = await this.usersRepository.findOne({ where: { id: userId } });
        if (!baseUser) return null;

        // Regra Multi-Tenant: Bloqueio total cross-tenant
        if (currentUser?.tenantId && baseUser.tenantId !== currentUser?.tenantId) {
             throw new BadRequestException('Acesso negado: Este usuário pertence a outra organização.');
        }

        // Regra Owner-Data: Ver contatos apenas se for o dono, o próprio ou um Admin do Tenant
        const isOwner = baseUser.ownerId === currentUser?.sub;
        const isOwnProfile = baseUser.id === currentUser?.sub;
        const isTenantAdmin = currentUser?.role === 'administrador';
        const isSystemAdmin = currentUser?.isSuperAdmin;

        const showContacts = isSystemAdmin || isOwnProfile || isOwner || isTenantAdmin;

        const relations = showContacts
            ? ['role', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profile']
            : ['role', 'tags', 'profile']; 

        return this.usersRepository.findOne({ 
            where: { id: userId }, 
            relations 
        });
    }

    async findAll(page?: number, limit?: number, name?: string, email?: string, cpf?: string, currentUser?: any): Promise<{ data: User[], total: number }> {
        const skip = page && limit ? (page - 1) * limit : 0;
        const tenantId = currentUser?.tenantId || this.TIWEB_ID;
        const isSystemAdmin = currentUser?.isSuperAdmin;

        const where: any = {};
        if (!isSystemAdmin && tenantId) {
            where.tenantId = tenantId;
        }

        if (name) where.name = ILike(`%${name}%`);
        if (email) where.email = Like(`%${email}%`);
        if (cpf) where.cpf = Like(`%${cpf}%`);

        const findOptions: FindManyOptions<User> = {
            order: { name: 'ASC' },
            skip,
            take: limit ?? undefined,
            where,
            relations: ['role', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profile'],
        };

        const [users, total] = await this.usersRepository.findAndCount(findOptions);

        const data = users.map(user => {
            const isOwner = user.ownerId === currentUser?.sub;
            const isOwnProfile = user.id === currentUser?.sub;
            const isTenantAdmin = user.tenantId === currentUser?.tenantId && currentUser?.role === 'administrador';

            if (isSystemAdmin || isOwnProfile || isOwner || isTenantAdmin) {
                return user; 
            }

            const { phones, addresses, secondaryEmails, links, ...basicInfo } = user;
            return basicInfo as User;
        });

        return { data, total };
    }

   async update(id: string, updateUserDto: UpdateUserDto, currentUser?: any): Promise<User> { 
        const user = await this.usersRepository.findOne({
            where: { id },
            relations: ['role', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags', 'profile'],
        });

        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
        }

        const isSystemAdmin = currentUser?.isSuperAdmin;

        if (!isSystemAdmin && currentUser?.tenantId && user.tenantId !== currentUser?.tenantId) {
             throw new BadRequestException('Acesso negado: Este usuário pertence a outra organização.');
        }

        const isOwner = user.ownerId === currentUser?.sub;
        const isOwnProfile = user.id === currentUser?.sub;

        if (!isSystemAdmin && !isOwner && !isOwnProfile) {
             throw new BadRequestException('Você não tem permissão para editar este usuário.');
        }

        if (updateUserDto.email && updateUserDto.email !== user.email) {
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

        if (updateUserDto.roleId) {
            const role = await this.rolesService.findOne(updateUserDto.roleId);
            user.role = role;
        }

        const { roleId, phones, addresses, secondaryEmails, links, tags, ...userUpdateData } = updateUserDto;
        this.usersRepository.merge(user, userUpdateData);

        const cleanItems = (items: any[]) => items.map(item => {
            const { id: itemId, ...rest } = item;
            const itemData = (itemId === null || itemId === undefined) ? rest : item;
            return { ...itemData, user: { id }, ownerId: user.ownerId, tenantId: user.tenantId };
        });

        if (phones) user.phones = cleanItems(phones) as any;
        if (addresses) user.addresses = cleanItems(addresses) as any;
        if (secondaryEmails) user.secondaryEmails = cleanItems(secondaryEmails) as any;
        if (links) user.links = cleanItems(links) as any;

        if (tags && tags.length > 0) {
            if (user.tags && user.tags.length > 0) {
                Object.assign(user.tags[0], { ...tags[0], ownerId: user.ownerId, tenantId: user.tenantId });
            }
        }

        return this.usersRepository.save(user);
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
        const user = await this.usersRepository.findOne({ where: { id } });
        
        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
        }

        const isSystemAdmin = currentUser?.isSuperAdmin;

        if (!isSystemAdmin && currentUser?.tenantId && user.tenantId !== currentUser?.tenantId) {
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
        await this.tagsService.createDefaultTag(user.id, user.ownerId!, user.tenantId!);
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
