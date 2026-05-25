import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users.service';
import { CreateUserDto } from '../../dto/user.dto';

@Injectable()
export class GoogleContactsService {
  private readonly logger = new Logger(GoogleContactsService.name);
  private readonly PEOPLE_API_LIST_URL = 'https://people.googleapis.com/v1/people/me/connections';
  private readonly PEOPLE_API_CREATE_URL = 'https://people.googleapis.com/v1/people:createContact';

  constructor(private readonly usersService: UsersService) {}

  /**
   * Importa contatos em massa do Google para o banco local (Multi-Tenant)
   */
  async importContacts(accessToken: string, currentUser: any): Promise<{ imported: number, total: number }> {
    if (!accessToken) {
      throw new UnauthorizedException('Access Token do Google não fornecido.');
    }

    let importedCount = 0;
    let nextPageToken: string | undefined = undefined;
    let totalConnections = 0;

    try {
      do {
        const url = new URL(this.PEOPLE_API_LIST_URL);
        url.searchParams.append('personFields', 'names,emailAddresses,phoneNumbers,organizations');
        url.searchParams.append('pageSize', '100');
        if (nextPageToken) {
          url.searchParams.append('pageToken', nextPageToken);
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            this.logger.error(`Erro na People API (List): ${response.status} - ${JSON.stringify(errorBody)}`);
            if (response.status === 401) {
                throw new UnauthorizedException('Token do Google expirado ou inválido.');
            }
            throw new Error(`Google API returned ${response.status}`);
        }

        const data = await response.json();
        const connections = data.connections || [];
        totalConnections = data.totalPeople || connections.length;
        nextPageToken = data.nextPageToken;

        for (const person of connections) {
          const name = person.names?.[0]?.displayName || 'Contato Google';
          const email = person.emailAddresses?.[0]?.value;

          if (!email) continue; 

          const phones = person.phoneNumbers?.map((p: any) => ({
            number: p.value.replace(/\s+/g, ''),
            isWhatsapp: false, 
            isMain: p.metadata?.primary || false,
          })) || [];

          // Prepara o DTO de criação
          const createUserDto: CreateUserDto = {
            name,
            email,
            password: '', // Removemos a senha dummy. Sem senha = Contato de agenda, não conta real.
            isActive: true,
            phones,
          };


          try {
            const existing = await this.usersService.findByEmail(email);
            if (!existing) {
              await this.usersService.create(createUserDto, currentUser);
              importedCount++;
            }
          } catch (err: any) {
            this.logger.warn(`Falha ao importar contato ${email}: ${err.message}`);
          }
        }
      } while (nextPageToken);

      return { imported: importedCount, total: totalConnections };

    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Erro ao consumir People API: ${error.message}`);
      throw error;
    }
  }

  /**
   * Salva um contato individual diretamente na conta Google do usuário
   * e também registra o contato no coffer (Users) do tenant local.
   */
  async saveLeadToGoogle(accessToken: string, leadData: { name: string, email: string, phone?: string }, currentUser: any): Promise<any> {
    if (!accessToken) {
      throw new UnauthorizedException('Access Token do Google não fornecido.');
    }

    this.logger.log(`Salvando lead ${leadData.email} no Google Contacts...`);

    const payload = {
      names: [{ givenName: leadData.name }],
      emailAddresses: [{ value: leadData.email }],
      phoneNumbers: leadData.phone ? [{ value: leadData.phone }] : []
    };

    try {
      const response = await fetch(this.PEOPLE_API_CREATE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        this.logger.error(`Erro na People API (Create): ${response.status} - ${JSON.stringify(errorBody)}`);
        if (response.status === 401) {
          throw new UnauthorizedException('Token do Google expirado ou inválido.');
        }
        throw new Error(`Google API returned ${response.status}`);
      }

      const result = await response.json();
      this.logger.log(`Lead salvo com sucesso no Google: ${result.resourceName}`);

      // SYNC AUTOMÁTICO LOCAL: Adiciona ao coffer de contatos do usuário logado
      try {
          const existing = await this.usersService.findByEmail(leadData.email);
          if (!existing) {
              const createUserDto: CreateUserDto = {
                  name: leadData.name,
                  email: leadData.email,
                  password: '', // Contato de agenda, sem senha
                  phones: leadData.phone ? [{ number: leadData.phone, isWhatsapp: false, isMain: true }] : [],
                  isActive: true
              };
              await this.usersService.create(createUserDto, currentUser);
              this.logger.log(`Lead ${leadData.email} sincronizado automaticamente no coffer local.`);
          }
      } catch (syncErr: any) {
          this.logger.warn(`Falha na sincronização automática local do lead: ${syncErr.message}`);
      }

      return result;

    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error(`Erro ao salvar contato no Google: ${error.message}`);
      throw error;
    }
  }
}
