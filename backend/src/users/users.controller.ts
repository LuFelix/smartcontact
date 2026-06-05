import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards, Delete, Query, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/user.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

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
    @ApiOperation({ summary: 'Criar um novo usuário/contato' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
    async create(@Body() createUserDto: CreateUserDto, @GetUser() currentUser: any) {
        return this.usersService.create(createUserDto, currentUser);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos os usuários do seu tenant' })
    async listAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('name') name?: string,
        @Query('email') email?: string,
        @Query('cpf') cpf?: string,
        @GetUser() currentUser?: any,
    ) {
        return this.usersService.findAll(page, limit, name, email, cpf, currentUser);
    }

    @Delete(':id/team')
    @Roles('administrador')
    @ApiOperation({ summary: 'Remover usuário da equipe (mantém no fichário)' })
    @ApiParam({ name: 'id', type: String })
    async demoteFromTeam(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() currentUser: any
    ) {
        return this.usersService.demoteFromTeam(id, currentUser);
    }

    @Delete(':id')
    @Roles('administrador')
    @ApiOperation({ summary: 'Deletar um usuário (Apenas Admin)' })
    @ApiParam({ name: 'id', type: String })
    remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() currentUser?: any) { 
        return this.usersService.remove(id, currentUser); 
    }
}