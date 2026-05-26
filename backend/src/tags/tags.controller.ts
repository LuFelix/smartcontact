import { Controller, Get, Post, Param, Body, NotFoundException, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Public()
  @Get('resolve/:identifier')
  @ApiOperation({ summary: 'Resolve a tag UUID or Username and return public user information' })
  @ApiResponse({ status: 200, description: 'Tag and public user info found' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async resolve(@Param('identifier') identifier: string) {
    const data = await this.tagsService.resolveTag(identifier);
    if (!data) {
      throw new NotFoundException('Tag ou Usuário não encontrado');
    }
    return data;
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
  @Post(':id/grant/:userId')
  @ApiOperation({ summary: 'Delega acesso a uma tag específica para outro usuário (Apenas Admin)' })
  async grantAccess(
      @Param('id', ParseUUIDPipe) tagId: string,
      @Param('userId', ParseUUIDPipe) targetUserId: string,
      @GetUser() currentUser: any
  ) {
      return this.tagsService.grantAccess(tagId, targetUserId, currentUser);
  }
}
