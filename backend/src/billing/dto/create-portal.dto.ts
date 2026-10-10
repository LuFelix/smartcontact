// billing/dto/create-portal.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUrl } from 'class-validator';

export class CreatePortalDto {
  @ApiProperty({
    description: 'URL de retorno após gerenciar assinatura',
    example: 'https://app.exemplo.com/billing',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  returnUrl?: string;
}