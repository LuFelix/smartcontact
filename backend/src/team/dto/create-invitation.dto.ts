import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsOptional, IsInt, Min } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({ example: 'uuid-da-role-aqui', description: 'ID da Role que o convidado terá' })
  @IsUUID()
  @IsNotEmpty()
  roleId!: string;

  @ApiProperty({ example: 48, description: 'Horas até o convite expirar (default: 48)', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInHours?: number;
}
