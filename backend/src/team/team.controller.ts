import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TeamService } from './team.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@ApiTags('Team Management')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post('members')
  @Roles('administrador')
  @ApiOperation({ summary: 'Convidar um novo membro para a equipe (Workspace)' })
  @ApiBody({ type: CreateMemberDto })
  @ApiResponse({ status: 201, description: 'Membro convidado com sucesso' })
  async addMember(@Body() createMemberDto: CreateMemberDto, @GetUser() currentUser: any) {
    return this.teamService.addMember(createMemberDto, currentUser);
  }

  @Get('members')
  @Roles('administrador')
  @ApiOperation({ summary: 'Listar todos os membros do seu Workspace' })
  async listMembers(@GetUser() currentUser: any) {
    return this.teamService.listTeamMembers(currentUser);
  }

  @Post('invitations')
  @Roles('administrador')
  @ApiOperation({ summary: 'Gerar um token de convite para a equipe' })
  @ApiBody({ type: CreateInvitationDto })
  @ApiResponse({ status: 201, description: 'Convite gerado com sucesso' })
  async createInvitation(@Body() dto: CreateInvitationDto, @GetUser() currentUser: any) {
    return this.teamService.createInvitation(dto, currentUser);
  }
}
