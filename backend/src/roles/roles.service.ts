// roles/roles.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CreateRoleDto } from './dto/role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/**
 * Serviço responsável por gerenciar 'roles' no sistema.
 */
@Injectable()
export class RolesService {
    private readonly PROTECTED_ROLES = ['administrador', 'usuario'];

    constructor(
        @InjectRepository(Role)
        private readonly rolesRepository: Repository<Role>,
    ) { }

    /**
     * Cria uma nova 'role' após validar se o nome já não está em uso.
     * 
     * - O nome é normalizado (sem espaços, minúsculo, com `_` entre palavras).
     * - Verifica se já existe uma 'role' com esse nome.
     * - Lança um erro se o nome já estiver registrado.
     * - Cria e salva a nova entidade 'Role' no banco de dados.
     * 
     * @param {CreateRoleDto} createRoleDto - Dados para criação da 'role'
     * @returns {Promise<Role>} A 'role' criada
     * @throws {BadRequestException} Se o nome já estiver em uso
     */
    async create(createRoleDto: CreateRoleDto): Promise<Role> {
        const nameNormalized = createRoleDto.name.trim().toLowerCase().replace(/\s+/g, '_');

        const existingRole = await this.rolesRepository.findOne({
            where: { name: nameNormalized },
        });

        if (existingRole) {
            throw new BadRequestException(`Role with name ${nameNormalized} already exists`);
        }

        const role = this.rolesRepository.create({ 
            name: nameNormalized,
            description: createRoleDto.description
        });
        return await this.rolesRepository.save(role);
    }

    /**
     * Busca todas as 'roles' com paginação.
     * 
     * @param {number} page - Número da página (começa em 1)
     * @param {number} limit - Número de itens por página
     * @returns {Promise<{ data: Role[]; total: number; page: number; limit: number; totalPages: number }>}
     */
    async findAll(page: number = 1, limit: number = 10): Promise<{
        data: Role[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const offset = (page - 1) * limit;
        
        const [roles, total] = await this.rolesRepository.findAndCount({
            skip: offset,
            take: limit,
            order: { id: 'ASC' },
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
     * Busca uma 'role' específica pelo ID.
     * 
     * @param {number} id - ID da 'role' a ser buscada
     * @returns {Promise<Role>} A 'role' encontrada
     * @throws {NotFoundException} Se a 'role' não for encontrada
     */
    async findOne(id: string): Promise<Role> {
        const role = await this.rolesRepository.findOne({
            where: { id },
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${id} not found`);
        }

        return role;
    }

    /**
     * Busca uma 'role' específica pelo nome.
     * 
     * @param {string} name - Nome da 'role' a ser buscada
     * @returns {Promise<Role>} A 'role' encontrada
     * @throws {NotFoundException} Se a 'role' não for encontrada
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
     * Atualiza uma 'role' específica pelo ID.
     * 
     * @param {number} id - ID da 'role' a ser atualizada
     * @param {UpdateRoleDto} updateRoleDto - Dados para atualização
     * @returns {Promise<Role>} A 'role' atualizada
     * @throws {NotFoundException} Se a 'role' não for encontrada
     * @throws {BadRequestException} Se o novo nome já estiver em uso por outra 'role'
     */
    async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
        const existingRole = await this.findOne(id);

        // Proteção contra renomeação de roles do sistema
        if (this.PROTECTED_ROLES.includes(existingRole.name)) {
            if (updateRoleDto.name && updateRoleDto.name.trim().toLowerCase().replace(/\s+/g, '_') !== existingRole.name) {
                throw new BadRequestException('As funções estruturais do sistema não podem ser renomeadas.');
            }
        }

        // Verificar se o novo nome já existe (excluindo a role atual)
        if (updateRoleDto.name) {
            const nameNormalized = updateRoleDto.name.trim().toLowerCase().replace(/\s+/g, '_');
            
            const existingRoleWithNewName = await this.rolesRepository.findOne({
                where: { name: nameNormalized } as FindOptionsWhere<Role>,
            });

            if (existingRoleWithNewName && existingRoleWithNewName.id !== id) {
                throw new BadRequestException(`Role with name ${nameNormalized} already exists`);
            }

            existingRole.name = nameNormalized;
        }

        if (updateRoleDto.description !== undefined) {
            existingRole.description = updateRoleDto.description;
        }

        return await this.rolesRepository.save(existingRole);
    }

    /**
     * Exclui uma 'role' específica pelo ID.
     * 
     * - Protege as roles 'administrador' e 'usuario' contra exclusão.
     * - Reatribui todos os usuários da role excluída para a role 'usuario' automaticamente.
     * 
     * @param {string} id - ID da 'role' a ser excluída
     * @returns {Promise<void>}
     * @throws {NotFoundException} Se a 'role' não for encontrada
     * @throws {BadRequestException} Se for uma role protegida
     */
    async remove(id: string): Promise<void> {
        const role = await this.rolesRepository.findOne({
            where: { id },
            relations: ['users']
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${id} not found`);
        }

        // Proteção de roles do sistema
        if (this.PROTECTED_ROLES.includes(role.name)) {
            throw new BadRequestException('As funções estruturais do sistema não podem ser excluídas.');
        }

        // 1. Localizar a role de fallback ("usuario")
        const defaultRole = await this.rolesRepository.findOne({ where: { name: 'usuario' } });
        if (!defaultRole) {
             throw new BadRequestException('Função de segurança "usuario" não encontrada no sistema.');
        }

        // 2. Reatribuir usuários (se houver) para a role padrão antes de excluir
        if (role.users && role.users.length > 0) {
            await this.rolesRepository.manager
                .createQueryBuilder()
                .update('User') // Referencia a entidade User
                .set({ role: defaultRole })
                .where('role_id = :id', { id })
                .execute();
        }

        await this.rolesRepository.remove(role);
    }

    /**
     * Verifica se uma 'role' existe pelo ID.
     * 
     * @param {number} id - ID da 'role' a ser verificada
     * @returns {Promise<boolean>} True se a 'role' existir, false caso contrário
     */
    async exists(id: string): Promise<boolean> {
        const role = await this.rolesRepository.findOne({
            where: { id },
        });
        return !!role;
    }

    /**
     * Busca múltiplas 'roles' por IDs.
     * 
     * @param {number[]} ids - Array de IDs das 'roles' a serem buscadas
     * @returns {Promise<Role[]>} Array de 'roles' encontradas
     */
    async findByIds(ids: string[]): Promise<Role[]> {
        if (!ids || ids.length === 0) {
            return [];
        }
        return await this.rolesRepository.findBy({
            id: ids as any, // TypeORM aceita arrays no where
        });
    }
}