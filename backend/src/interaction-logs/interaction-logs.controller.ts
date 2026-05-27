import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InteractionLogsService } from './interaction-logs.service';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

@ApiTags('Interaction Logs')
@Controller('interaction-logs')
export class InteractionLogsController {
  constructor(private readonly logsService: InteractionLogsService) {}

  @Public()
  @Post('capture-lead/:tagId')
  @ApiOperation({ summary: 'Captura dados de um lead vindo de uma tag NFC' })
  async captureLead(
    @Body() leadData: { name: string, email: string, phone?: string, note?: string },
    @Req() req: Request,
    @Body('tagId') tagIdParam: string // Caso venha no body, ou use o param
  ) {
    const metadata = {
        ip: req.ip || req.headers['x-forwarded-for'] || '0.0.0.0',
        userAgent: req.headers['user-agent'] || 'unknown',
    };
    // tagId deve vir da URL ou do body
    return this.logsService.captureLead(tagIdParam, leadData, metadata);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('leads')
  @ApiOperation({ summary: 'Listar todos os leads acessíveis pelo usuário logado (ABAC)' })
  async listMyLeads(@GetUser() currentUser: any) {
    return this.logsService.findLeadsByOwner(currentUser);
  }
}
