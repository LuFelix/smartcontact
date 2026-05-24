// users/users.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FindManyOptions, ILike, Like, Repository } from 'typeorm';
import { CreateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from 'src/roles/entities/role.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesService } from 'src/roles/roles.service';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,

        @InjectRepository(Role)
        private readonly rolesRepository: Repository<Role>,

        private readonly rolesService: RolesService,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        let { email, cpf, password, roleId, phones, addresses, secondaryEmails, links } = createUserDto; 

        const emailExists = await this.usersRepository.findOne({ where: { email } });
        if (emailExists) {
            throw new BadRequestException('Usuário com este e-mail já existe');
        }

        // Tratamento do CPF opcional
        if (cpf === "" || cpf === undefined) {
            cpf = null as any;
        }

        if (cpf) {
            const cpfExists = await this.usersRepository.findOne({ where: { cpf } });
            if (cpfExists) {
                throw new BadRequestException('Usuário com este CPF já existe');
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let assignedRole;
        if (roleId) {
            assignedRole = await this.rolesRepository.findOne({ where: { id: roleId } });
        } else {
            assignedRole = await this.rolesRepository.findOne({ where: { name: 'colaborador' } });
        }

        if (!assignedRole) {
            throw new BadRequestException('Role especificada não existe');
        }

        // Limpeza de IDs nulos
        const cleanItems = (items: any[] | undefined) => items ? items.map(item => {
            const { id, ...restItem } = item;
            return restItem;
        }) : [];

        const user = this.usersRepository.create({
            name: createUserDto.name,
            email: createUserDto.email,
            cpf: cpf as any, 
            password: hashedPassword,
            isActive: createUserDto.isActive ?? true,
            role: assignedRole,
            phones: cleanItems(phones),
            addresses: cleanItems(addresses),
            secondaryEmails: cleanItems(secondaryEmails),
            links: cleanItems(links),
        });

        return this.usersRepository.save(user);
    }

    async findByCpf(cpf: string): Promise<User | null> {
        return this.usersRepository.findOne({ 
            where: { cpf }, 
            relations: ['role', 'phones', 'addresses'] 
        });
    }

    async findById(userId: string): Promise<User | null> {
        return this.usersRepository.findOne({ 
            where: { id: userId }, 
            relations: ['role', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags'] 
        });
    }

    async findAll(page?: number, limit?: number, name?: string, email?: string, cpf?: string): Promise<{ data: User[], total: number }> {
        const skip = page && limit ? (page - 1) * limit : 0;

        const where: any = {};

        if (name) {
            where.name = ILike(`%${name}%`);
        }
        if (email) {
            where.email = Like(`%${email}%`);
        }
        if (cpf) {
            where.cpf = Like(`%${cpf}%`);
        }

        const findOptions: FindManyOptions<User> = {
            order: {
                name: 'ASC',
            },
            skip: skip,
            take: limit ?? undefined,
            where: where,
            relations: ['role', 'phones', 'addresses', 'secondaryEmails', 'links', 'tags'],
        };

        const [data, total] = await this.usersRepository.findAndCount(findOptions);

        return {
            data,
            total,
        };
    }

   async update(id: string, updateUserDto: UpdateUserDto): Promise<User> { 
        const user = await this.usersRepository.findOne({
            where: { id },
            relations: ['role', 'phones', 'addresses', 'secondaryEmails', 'links'],
        });

        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
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

        // TypeORM cascade handles update if items have IDs, or creates new ones if they don't.
        const { roleId, phones, addresses, secondaryEmails, links, ...userUpdateData } = updateUserDto;
        
        this.usersRepository.merge(user, userUpdateData);

        // Função auxiliar para remover IDs nulos que quebram o cascade do TypeORM
        const cleanItems = (items: any[]) => items.map(item => {
            if (item.id === null || item.id === undefined) {
                const { id, ...rest } = item;
                return rest;
            }
            return item;
        });

        if (phones) {
            user.phones = cleanItems(phones).map(p => ({ ...p, userId: id })) as any;
        }
        if (addresses) {
            user.addresses = cleanItems(addresses).map(a => ({ ...a, userId: id })) as any;
        }
        if (secondaryEmails) {
            user.secondaryEmails = cleanItems(secondaryEmails).map(e => ({ ...e, userId: id })) as any;
        }
        if (links) {
            user.links = cleanItems(links).map(l => ({ ...l, userId: id })) as any;
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
    
    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepository.findOne({ 
            where: { email }, 
            relations: ['role', 'phones', 'addresses'] 
        });
    }

    async remove(id: string): Promise<{ message: string }> { 
        const user = await this.usersRepository.findOneBy({ id });
        
        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado.`);
        }

        await this.usersRepository.delete(id);

        return { message: `Usuário com ID ${id} foi removido com sucesso.` };
    }
}
