import { Controller, Get, Post, Delete, Patch, Param, Body, NotFoundException, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get('resolve/:identifier')
  @ApiOperation({ summary: 'Resolve a tag UUID or Username and return public user information' })
  @ApiResponse({ status: 200, description: 'Tag and public user info found' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async resolve(
    @Param('identifier') identifier: string,
    @Query('source') source?: string
  ) {
    const data = await this.tagsService.resolveTag(identifier, source);
    if (!data) {
      throw new NotFoundException('Tag ou Usuário não encontrado');
    }
    return data;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post()
  @ApiOperation({ summary: 'Cadastra uma nova tag no estoque do Workspace (Apenas Admin)' })
  @ApiBody({ type: CreateTagDto })
  async create(
      @Body() createTagDto: CreateTagDto,
      @GetUser() currentUser: any
  ) {
      return this.tagsService.create(createTagDto, currentUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get()
  @ApiOperation({ summary: 'Lista todas as tags acessíveis para o usuário logado (Multi-Tenant + ABAC)' })
  async findAll(@GetUser() currentUser: any) {
      return this.tagsService.findAll(currentUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Remove uma tag do estoque (Apenas Admin)' })
  async remove(
      @Param('id', ParseUUIDPipe) tagId: string,
      @GetUser() currentUser: any
  ) {
      return this.tagsService.remove(tagId, currentUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get(':id/delegations')
  @ApiOperation({ summary: 'Lista os usuários que têm acesso a uma tag específica (Apenas Admin)' })
  async getDelegations(
      @Param('id', ParseUUIDPipe) tagId: string,
      @GetUser() currentUser: any
  ) {
      return this.tagsService.getDelegations(tagId, currentUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post(':id/grant/:userId')
  @ApiOperation({ summary: 'Delega acesso a uma tag específica para outro usuário (Apenas Admin)' })
  async grantAccess(
      @Param('id', ParseUUIDPipe) tagId: string,
      @Param('userId', ParseUUIDPipe) targetUserId: string,
      @GetUser() currentUser: any
  ) {
      return this.tagsService.grantAccess(tagId, targetUserId, currentUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id/revoke/:userId')
  @ApiOperation({ summary: 'Revoga acesso a uma tag específica de outro usuário (Apenas Admin)' })
  async revokeAccess(
      @Param('id', ParseUUIDPipe) tagId: string,
      @Param('userId', ParseUUIDPipe) targetUserId: string,
      @GetUser() currentUser: any
  ) {
      return this.tagsService.revokeAccess(tagId, targetUserId, currentUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza as configurações de uma Tag (ABAC restrito)' })
  @ApiBody({ type: UpdateTagDto })
  async update(
      @Param('id', ParseUUIDPipe) tagId: string,
      @Body() updateTagDto: UpdateTagDto,
      @GetUser() currentUser: any
  ) {
      return this.tagsService.update(tagId, updateTagDto, currentUser);
  }
}
