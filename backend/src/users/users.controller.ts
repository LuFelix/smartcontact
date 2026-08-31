import { Body, Controller, Get, NotFoundException, Param, Patch, UseGuards, Delete, Query, ParseUUIDPipe, Post, Req, Put, Headers, ForbiddenException } from '@nestjs/common';
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

    @Get(':id')
    @ApiOperation({ summary: 'Busca um usuário por ID' })
    @ApiParam({ name: 'id', type: String })
    @ApiResponse({ status: 200, description: 'Usuário encontrado' })
    @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
    async findById(@Param('id', ParseUUIDPipe) id: string, @GetUser() currentUser?: any) { 
        const user = await this.usersService.findById(id, currentUser); 
        if (!user) {
            throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
        }
        return user;
    }

    
  @Post(':id/initialize-profile')
  @ApiOperation({ summary: 'Inicializa a Tag de Perfil do usuário para o Tenant atual (Contingência)' })
  async initializeProfile(@Param('id', ParseUUIDPipe) id: string, @GetUser() currentUser: any, @Headers('x-tenant-id') tenantId: string) {
      if (id !== currentUser?.sub && !currentUser?.isSuperAdmin) {
          throw new ForbiddenException('Apenas o próprio usuário pode inicializar seu perfil.');
      }
      return this.usersService.ensureUserHasDefaultTagForTenant(id, tenantId);
  }

  @Patch(':id')
    @ApiOperation({ summary: 'Atualiza parcialmente um usuário' })
    @ApiParam({ name: 'id', type: String })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
    @ApiResponse({ status: 400, description: 'Dados inválidos ou duplicados' })
    @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
    async update( 
        @Param('id', ParseUUIDPipe) id: string, 
        @Body() updateUserDto: UpdateUserDto,
        @GetUser() currentUser?: any
    ){
        return this.usersService.update(id, updateUserDto, currentUser); 
    }

    @Post(':id/promote')
    @Roles('administrador')
    @ApiOperation({ summary: 'Promover contato para membro da equipe' })
    @ApiParam({ name: 'id', type: String })
    @ApiBody({ schema: { type: 'object', properties: { roleId: { type: 'string' }, email: { type: 'string' } } } })
    async promoteToTeam(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('roleId') roleId: string,
        @Body('email') email: string,
        @GetUser() currentUser: any
    ) {
        return this.usersService.promoteToTeam(id, roleId, currentUser, email);
    }

    @Get(':id/tags')
    @ApiOperation({ summary: 'Listar IDs das tags/recursos delegados a um usuário no workspace atual' })
    @ApiParam({ name: 'id', type: String })
    async getUserTags(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser() currentUser: any
    ) {
        return this.usersService.getUserTags(id, currentUser);
    }

    @Put(':id/tags')
    @Roles('administrador')
    @ApiOperation({ summary: 'Atualizar tags/recursos delegados a um usuário no workspace atual em lote' })
    @ApiParam({ name: 'id', type: String })
    @ApiBody({ schema: { type: 'array', items: { type: 'string' } } })
    async updateUserTags(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() tagIds: string[],
        @GetUser() currentUser: any
    ) {
        return this.usersService.updateUserTags(id, tagIds, currentUser);
    }
}