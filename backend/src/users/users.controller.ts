import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards, Delete, Query, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
    
    constructor(private readonly usersService: UsersService) {}

// =======================================================
// 🔴 ROTAS DE ADMINISTRAÇÃO E GESTÃO
// =======================================================

    @Post()
    @Roles('administrador')
    @ApiOperation({ summary: 'Criar um novo usuário (Apenas Admin)' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
    async create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @Roles('administrador') 
    @ApiOperation({ summary: 'Listar todos os usuários (Apenas Admin)' })
    async listAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('name') name?: string,
        @Query('email') email?: string,
        @Query('cpf') cpf?: string,
    ) {
        return this.usersService.findAll(page, limit, name, email, cpf);
    }
    
    @Delete(':id')
    @Roles('administrador')
    @ApiOperation({ summary: 'Deletar um usuário (Apenas Admin)' })
    @ApiParam({ name: 'id', type: String }) // <-- Alterado para String
    remove(@Param('id', ParseUUIDPipe) id: string) { // <-- ParseUUIDPipe e string
        return this.usersService.remove(id); // <-- Envia string pro service
    }

    @Get(':id')
    @ApiOperation({ summary: 'Busca um usuário por ID' })
    @ApiParam({ name: 'id', type: String }) // <-- Alterado para String
    @ApiResponse({ status: 200, description: 'Usuário encontrado' })
    @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
    async findById(@Param('id', ParseUUIDPipe) id: string) { // <-- ParseUUIDPipe e string
        const user = await this.usersService.findById(id); // <-- Envia string pro service
        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
        }
        return user;
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Atualiza parcialmente um usuário' })
    @ApiParam({ name: 'id', type: String }) // <-- Alterado para String
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos ou duplicados' })
    @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
    async update( 
        @Param('id', ParseUUIDPipe) id: string, // <-- ParseUUIDPipe e string
        @Body() updateUserDto: UpdateUserDto 
    ){
        return this.usersService.update(id, updateUserDto); // <-- Envia string pro service
    }
}