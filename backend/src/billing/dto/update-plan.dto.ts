// billing/dto/update-plan.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { BillingInterval } from '../billing.constants';

/**
 * DTO de atualização de plano — todos os campos opcionais.
 * Campos de limite aceitam null = ilimitado.
 */
export class UpdatePlanDto {
  @ApiProperty({
    description: 'Código estável único do plano (slug)',
    example: 'starter',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'code deve conter apenas minúsculas, números, hífen ou underscore',
  })
  code?: string;

  @ApiProperty({ description: 'Nome exibido do plano', example: 'Pro Plus', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiProperty({ description: 'Descrição do plano', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Preço mensal em centavos (0 = gratuito)',
    example: 5990,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @ApiProperty({ description: 'Intervalo de cobrança', enum: BillingInterval, required: false })
  @IsOptional()
  @IsEnum(BillingInterval)
  interval?: BillingInterval;

  @ApiProperty({
    description: 'Limite de membros (null = ilimitado)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  maxMembers?: number | null;

  @ApiProperty({
    description: 'Limite de tags (null = ilimitado)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  maxTags?: number | null;

  @ApiProperty({
    description: 'Limite de leads (null = ilimitado)',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  maxLeads?: number | null;

  @ApiProperty({ description: 'Plano visível no catálogo', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Ordem de exibição no catálogo', required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
