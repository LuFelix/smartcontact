import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class UserRespondeDto {
  @ApiProperty({ description: 'ID do usuário (UUID)' })
  id: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;

  @ApiProperty({ example: '12345678900', nullable: true })
  cpf: string | null;

  @ApiProperty({ example: 'Colaborador', required: false })
  role?: string;

  @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
  phones?: any[];

  @ApiProperty({ type: 'array', items: { type: 'object' }, required: false })
  addresses?: any[];

  @ApiProperty({ description: 'Status de verificação do e-mail' })
  isVerified: boolean;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.cpf = user.cpf ?? null;
    this.isVerified = user.isVerified;
    
    // Pega a role da primeira membership (ou poderia receber o tenantId do contexto para ser mais preciso)
    const activeMembership = user.memberships && user.memberships.length > 0 ? user.memberships[0] : null;
    this.role = activeMembership && activeMembership.role ? activeMembership.role.name : undefined;
    
    this.phones = user.phones || [];
    this.addresses = user.addresses || [];
  }
}
