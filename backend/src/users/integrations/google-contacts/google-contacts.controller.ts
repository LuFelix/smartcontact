import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GoogleContactsService } from './google-contacts.service';
import { GetUser } from '../../../auth/decorators/get-user.decorator';

@ApiTags('Integrations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('integrations/google-contacts')
export class GoogleContactsController {
  constructor(private readonly googleContactsService: GoogleContactsService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Sincronizar contatos da conta Google logada' })
  @ApiBody({ 
      schema: { 
          type: 'object', 
          properties: { 
              accessToken: { type: 'string', description: 'Access Token do Google com escopo contacts.readonly' } 
          } 
      } 
  })
  async sync(@Body('accessToken') accessToken: string, @GetUser() currentUser: any) {
    return this.googleContactsService.importContacts(accessToken, currentUser);
  }

  @Post('save-lead')
  @ApiOperation({ summary: 'Salva um lead capturado direto no Google Contatos do usuário' })
  @ApiBody({
      schema: {
          type: 'object',
          properties: {
              accessToken: { type: 'string' },
              lead: {
                  type: 'object',
                  properties: {
                      name: { type: 'string' },
                      email: { type: 'string' },
                      phone: { type: 'string' }
                  }
              }
          }
      }
  })
  async saveLead(@Body() data: { accessToken: string, lead: any }) {
    return this.googleContactsService.saveLeadToGoogle(data.accessToken, data.lead);
  }
}
