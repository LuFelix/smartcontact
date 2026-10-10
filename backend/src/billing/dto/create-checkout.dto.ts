// billing/dto/create-checkout.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({
    description: 'Código do plano a ser assinado',
    example: 'pro',
  })
  @IsString()
  @IsNotEmpty()
  planCode!: string;

  @ApiProperty({
    description: 'URL de redirecionamento após sucesso',
    example: 'https://app.exemplo.com/billing/success',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  successUrl?: string;

  @ApiProperty({
    description: 'URL de redirecionamento após cancelamento',
    example: 'https://app.exemplo.com/billing/cancel',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  cancelUrl?: string;
}