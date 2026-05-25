// roles/roles.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { CreateRoleDto } from './dto/role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/**
 * Serviço responsável por gerenciar 'roles' no sistema.
 */
@Injectable()
export class RolesService {
    // Roles fundamentais que nascem com o sistema (Globais)
    private readonly PROTECTED_ROLES = ['administrador', 'usuario', 'colaborador'];
    private readonly SYSTEM_TENANT_ID = 'aebfbdfa-0088-4bf1-9bee-36529cfc3866'; // ID da Tiweb/Admin

    constructor(
        @InjectRepository(Role)
        private readonly rolesRepository: Repository<Role>,
    ) { }

    /**
     * Cria uma nova 'role' vinculada a um tenant.
     */
    async create(createRoleDto: CreateRoleDto, currentUser: any): Promise<Role> {
        const nameNormalized = createRoleDto.name.trim().toLowerCase().replace(/\s+/g, '_');
        const tenantId = currentUser.tenantId || this.SYSTEM_TENANT_ID;
        const ownerId = currentUser.sub || this.SYSTEM_TENANT_ID;

        // Verifica se já existe uma role com esse nome NO MESMO TENANT ou se é uma Role de Sistema
        const existingRole = await this.rolesRepository.findOne({
            where: [
                { name: nameNormalized, tenantId },
                { name: nameNormalized, tenantId: null } // Roles globais/sistema
            ],
        });

        if (existingRole) {
            throw new BadRequestException(`A função "${createRoleDto.name}" já existe.`);
        }

        const role = this.rolesRepository.create({ 
            name: nameNormalized,
            description: createRoleDto.description,
            tenantId,
            ownerId
        });
        
        return await this.rolesRepository.save(role);
    }

    /**
     * Busca todas as 'roles' visíveis para o tenant logado.
     * Inclui as roles globais do sistema + as customizadas do tenant.
     */
    async findAll(page: number = 1, limit: number = 10, currentUser?: any): Promise<{
        data: Role[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const offset = (page - 1) * limit;
        const tenantId = currentUser?.tenantId || this.SYSTEM_TENANT_ID;
        const isSystemAdmin = currentUser?.isSuperAdmin;

        let where: any = [];
        
        if (isSystemAdmin) {
            // Super Admin vê TUDO de todos
            where = {};
        } else {
            // Usuário comum vê as globais (tenant null) + as da sua empresa
            where = [
                { tenantId: tenantId },
                { tenantId: null } // Roles de sistema (opcional: ou vinculadas ao tenant sistema)
            ];
            // Nota: Se no seed as roles de sistema ganharem o TIWEB_ID, ajustamos o filtro.
            // Atualmente o seed as vincula ao TIWEB_ID? Vamos conferir.
        }
        
        const [roles, total] = await this.rolesRepository.findAndCount({
            where,
            skip: offset,
            take: limit,
            order: { name: 'ASC' },
        });

        const totalPages = Math.ceil(total / limit);

        return {
            data: roles,
            total,
            page,
            limit,
            totalPages,
        };
    }

    /**
     * Busca uma 'role' específica pelo ID com isolamento.
     */
    async findOne(id: string, currentUser?: any): Promise<Role> {
        const role = await this.rolesRepository.findOne({
            where: { id },
        });

        if (!role) {
            throw new NotFoundException(`Função com ID ${id} não encontrada.`);
        }

        const isSystemAdmin = currentUser?.isSuperAdmin;
        const isGlobalRole = !role.tenantId || role.tenantId === this.SYSTEM_TENANT_ID;

        // Se não for admin global, só pode ver se for global ou do próprio tenant
        if (!isSystemAdmin && !isGlobalRole && role.tenantId !== currentUser?.tenantId) {
             throw new BadRequestException('Acesso negado: Esta função pertence a outra organização.');
        }

        return role;
    }

    /**
     * Busca uma 'role' específica pelo nome (usada internamente).
     */
    async findOneByName(name: string): Promise<Role> {
        const nameNormalized = name.trim().toLowerCase().replace(/\s+/g, '_');
        
        const role = await this.rolesRepository.findOne({
            where: { name: nameNormalized },
        });

        if (!role) {
            throw new NotFoundException(`Role with name ${nameNormalized} not found`);
        }

        return role;
    }

    /**
     * Atualiza uma 'role' customizada.
     */
    async update(id: string, updateRoleDto: UpdateRoleDto, currentUser: any): Promise<Role> {
        const existingRole = await this.findOne(id, currentUser);

        // 1. Proteção contra alteração de roles do sistema
        if (this.PROTECTED_ROLES.includes(existingRole.name)) {
            if (updateRoleDto.name && updateRoleDto.name.trim().toLowerCase().replace(/\s+/g, '_') !== existingRole.name) {
                throw new BadRequestException('As funções estruturais do sistema não podem ser renomeadas.');
            }
        }

        // 2. Proteção de Dono (Só quem criou ou Admin do sistema altera customizadas)
        const isOwner = existingRole.ownerId === currentUser.sub;
        const isSystemAdmin = currentUser.isSuperAdmin;

        if (!isSystemAdmin && !isOwner && !this.PROTECTED_ROLES.includes(existingRole.name)) {
             throw new BadRequestException('Você não tem permissão para alterar esta função customizada.');
        }

        // Verificar se o novo nome já existe no tenant (excluindo a role atual)
        if (updateRoleDto.name) {
            const nameNormalized = updateRoleDto.name.trim().toLowerCase().replace(/\s+/g, '_');
            
            const existingDuplicate = await this.rolesRepository.findOne({
                where: { name: nameNormalized, tenantId: existingRole.tenantId } as FindOptionsWhere<Role>,
            });

            if (existingDuplicate && existingDuplicate.id !== id) {
                throw new BadRequestException(`A função "${nameNormalized}" já existe neste ambiente.`);
            }

            existingRole.name = nameNormalized;
        }

        if (updateRoleDto.description !== undefined) {
            existingRole.description = updateRoleDto.description;
        }

        return await this.rolesRepository.save(existingRole);
    }

    /**
     * Exclui uma 'role' customizada.
     */
    async remove(id: string, currentUser: any): Promise<void> {
        const role = await this.rolesRepository.findOne({
            where: { id },
            relations: ['users']
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${id} not found`);
        }

        // 1. Proteção Multi-Tenant
        const isSystemAdmin = currentUser.isSuperAdmin;
        if (!isSystemAdmin && role.tenantId !== currentUser.tenantId) {
             throw new BadRequestException('Acesso negado: Esta função pertence a outra organização.');
        }

        // 2. Proteção de roles do sistema
        if (this.PROTECTED_ROLES.includes(role.name)) {
            throw new BadRequestException('As funções estruturais do sistema não podem ser excluídas.');
        }

        // 3. Proteção de Dono
        if (!isSystemAdmin && role.ownerId !== currentUser.sub) {
             throw new BadRequestException('Você só pode excluir funções que você mesmo criou.');
        }

        // 4. Localizar a role de fallback ("usuario")
        const defaultRole = await this.rolesRepository.findOne({ where: { name: 'usuario' } });
        if (!defaultRole) {
             throw new BadRequestException('Função de segurança "usuario" não encontrada no sistema.');
        }

        // 5. Reatribuir usuários
        if (role.users && role.users.length > 0) {
            await this.rolesRepository.manager
                .createQueryBuilder()
                .update('User')
                .set({ role: defaultRole })
                .where('role_id = :id', { id })
                .execute();
        }

        await this.rolesRepository.remove(role);
    }

    async exists(id: string): Promise<boolean> {
        const role = await this.rolesRepository.findOne({
            where: { id },
        });
        return !!role;
    }

    async findByIds(ids: string[]): Promise<Role[]> {
        if (!ids || ids.length === 0) {
            return [];
        }
        return await this.rolesRepository.findBy({
            id: ids as any,
        });
    }
}