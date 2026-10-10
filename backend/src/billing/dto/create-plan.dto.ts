// billing/dto/create-plan.dto.ts
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
 * DTO de criação de plano (catálogo global — apenas administradores).
 * Campos de limite aceitam null = ilimitado.
 */
export class CreatePlanDto {
  @ApiProperty({
    description: 'Código estável único do plano (slug)',
    example: 'starter',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'code deve conter apenas minúsculas, números, hífen ou underscore',
  })
  code!: string;

  @ApiProperty({ description: 'Nome exibido do plano', example: 'Starter' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty({
    description: 'Descrição do plano',
    example: 'Para quem está começando',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Preço mensal em centavos (0 = gratuito)',
    example: 1990,
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
    example: 3,
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
    example: 20,
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
    example: 200,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  maxLeads?: number | null;

  @ApiProperty({ description: 'Plano visível no catálogo', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Ordem de exibição no catálogo', example: 0, required: false })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
