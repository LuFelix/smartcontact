import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Public } from '../auth/decorators/public.decorator';
import { TeamService } from './team.service';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly teamService: TeamService) {}

  @Public()
  @Get('resolve/:token')
  @ApiOperation({ summary: 'Validar um token de convite' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  async resolve(@Param('token') token: string) {
    return this.teamService.resolveInvitation(token);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('accept/:token')
  @ApiOperation({ summary: 'Aceitar um convite e entrar na equipe' })
  @ApiResponse({ status: 200, description: 'Convite aceito com sucesso' })
  async accept(@Param('token') token: string, @GetUser() currentUser: any) {
    return this.teamService.acceptInvitation(token, currentUser);
  }
}
