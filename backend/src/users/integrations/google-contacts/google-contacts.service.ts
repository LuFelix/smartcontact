import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users.service';
import { CreateUserDto } from '../../dto/user.dto';

@Injectable()
export class GoogleContactsService {
  private readonly logger = new Logger(GoogleContactsService.name);
  private readonly PEOPLE_API_URL = 'https://people.googleapis.com/v1/people/me/connections';

  constructor(private readonly usersService: UsersService) {}

  async importContacts(accessToken: string, currentUser: any): Promise<{ imported: number, total: number }> {
    if (!accessToken) {
      throw new UnauthorizedException('Access Token do Google não fornecido.');
    }

    let importedCount = 0;
    let nextPageToken: string | undefined = undefined;
    let totalConnections = 0;

    try {
      do {
        const url = new URL(this.PEOPLE_API_URL);
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
            this.logger.error(`Erro na People API: ${response.status} - ${JSON.stringify(errorBody)}`);
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

          const createUserDto: CreateUserDto = {
            name,
            email,
            password: Math.random().toString(36).slice(-12),
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
}
