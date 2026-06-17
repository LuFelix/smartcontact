import { 
  Body, 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  ParseUUIDPipe, 
  Query,
  UseGuards
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/role.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from './entities/role.entity';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('create')
  @Roles('administrador') // Apenas admins podem criar novas roles no tenant
  @ApiOperation({ summary: 'Cria uma nova role no tenant' })
  @ApiBody({ type: CreateRoleDto })
  @ApiResponse({ status: 201, description: 'Role criada com sucesso', type: Role })
  async createRole(@Body() createRoleDto: CreateRoleDto, @GetUser() currentUser: any): Promise<Role> {
    return this.rolesService.create(createRoleDto, currentUser);
  }

  @Get()
  @ApiOperation({ summary: 'Lista as roles visíveis para o usuário (Sistema + Custom)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @GetUser() currentUser: any,
  ): Promise<{ data: Role[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.rolesService.findAll(page, limit, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca uma role pelo ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() currentUser: any): Promise<Role> {
    return this.rolesService.findOne(id, currentUser);
  }

  @Put(':id')
  @Roles('administrador')
  @ApiOperation({ summary: 'Atualiza uma role customizada' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @GetUser() currentUser: any
  ): Promise<Role> {
    return this.rolesService.update(id, updateRoleDto, currentUser);
  }

  @Delete(':id')
  @Roles('administrador')
  @ApiOperation({ summary: 'Exclui uma role customizada' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @GetUser() currentUser: any): Promise<void> {
    return this.rolesService.remove(id, currentUser);
  }

  @Get('name/:name')
  @ApiOperation({ summary: 'Lista uma role pelo nome' })
  async findOneByName(@Param('name') name: string): Promise<Role> {
    // findOneByName ainda é global ou deve ser restrito? 
    // Por enquanto mantemos global para busca de sistema, mas o ideal seria filtrar por tenant se for custom.
    return this.rolesService.findOneByName(name);
  }
}
