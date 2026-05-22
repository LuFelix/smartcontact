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
        const { email, cpf, password, role_id, phones, addresses } = createUserDto; 

        const emailExists = await this.usersRepository.findOne({ where: { email } });
        if (emailExists) {
            throw new BadRequestException('Usuário com este e-mail já existe');
        }

        if (cpf) {
            const cpfExists = await this.usersRepository.findOne({ where: { cpf } });
            if (cpfExists) {
                throw new BadRequestException('Usuário com este CPF já existe');
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let assignedRole;
        if (role_id) {
            assignedRole = await this.rolesRepository.findOne({ where: { id: role_id } });
        } else {
            assignedRole = await this.rolesRepository.findOne({ where: { name: 'colaborador' } });
        }

        if (!assignedRole) {
            throw new BadRequestException('Role especificada não existe');
        }

        const user = this.usersRepository.create({
            ...createUserDto,
            password: hashedPassword,
            role: assignedRole,
            phones: phones ? phones.map(p => ({ ...p })) : [],
            addresses: addresses ? addresses.map(a => ({ ...a })) : [],
            secondaryEmails: (createUserDto as any).secondaryEmails ? (createUserDto as any).secondaryEmails.map((e: any) => ({ ...e })) : [],
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
            relations: ['role', 'phones', 'addresses'] 
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
            relations: ['role', 'phones', 'addresses'],
            // Removi o 'select' restritivo para garantir que as relações venham completas
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
            relations: ['role', 'phones', 'addresses'],
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
        // For simpler logic, we'll merge the top level properties first.
        const { roleId, phones, addresses, secondaryEmails, ...userUpdateData } = updateUserDto;
        
        this.usersRepository.merge(user, userUpdateData);

        if (phones) {
            user.phones = phones as any;
        }
        if (addresses) {
            user.addresses = addresses as any;
        }
        if (secondaryEmails) {
            user.secondaryEmails = secondaryEmails as any;
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
