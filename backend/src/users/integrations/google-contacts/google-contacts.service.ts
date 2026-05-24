import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
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
        const response = await axios.get(this.PEOPLE_API_URL, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            personFields: 'names,emailAddresses,phoneNumbers,organizations',
            pageSize: 100,
            pageToken: nextPageToken,
          },
        });

        const connections = response.data.connections || [];
        totalConnections = response.data.totalPeople || connections.length;
        nextPageToken = response.data.nextPageToken;

        for (const person of connections) {
          const name = person.names?.[0]?.displayName || 'Contato Google';
          const email = person.emailAddresses?.[0]?.value;

          if (!email) continue; // Ignora contatos sem e-mail para evitar erros de login

          const phones = person.phoneNumbers?.map((p: any) => ({
            number: p.value.replace(/\s+/g, ''),
            isWhatsapp: false, // Não temos como saber, assume false
            isMain: p.metadata?.primary || false,
          })) || [];

          // Prepara o DTO de criação
          const createUserDto: CreateUserDto = {
            name,
            email,
            password: Math.random().toString(36).slice(-12), // Senha aleatória
            isActive: true,
            phones,
            // Endereços e Links podem ser adicionados depois se a API prover
          };

          try {
            // Upsert Logic: O UsersService.create já trata e-mail existente (lança erro)
            // Vamos tentar buscar antes ou tratar o erro
            const existing = await this.usersService.findByEmail(email);
            if (!existing) {
              await this.usersService.create(createUserDto, currentUser);
              importedCount++;
            } else {
                // Opcional: Atualizar dados do contato existente se for do mesmo tenant
                if (existing.tenantId === currentUser.tenantId) {
                    // TODO: Implementar atualização se necessário
                }
            }
          } catch (err: any) {
            this.logger.warn(`Falha ao importar contato ${email}: ${err.message}`);
          }
        }
      } while (nextPageToken);

      return { imported: importedCount, total: totalConnections };

    } catch (error: any) {
      this.logger.error(`Erro ao consumir People API: ${error.message}`);
      if (error.response?.status === 401) {
          throw new UnauthorizedException('Token do Google expirado ou inválido.');
      }
      throw error;
    }
  }
}
