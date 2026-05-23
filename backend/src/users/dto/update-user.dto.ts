// update-user.dto.ts
import { IsOptional, IsString, IsEmail, Length, IsArray, ValidateNested, IsBoolean, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AddressTag } from '../entities/address.entity';

export class UpdatePhoneDto {
  @ApiPropertyOptional({ example: 'uuid-here' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ example: '11987654321' })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  number?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isWhatsapp?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ example: 'uuid-here' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: '123' })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiPropertyOptional({ example: 'Apto 45' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'São Paulo' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'SP' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  @Length(8, 10)
  zipCode?: string;

  @ApiPropertyOptional({ enum: AddressTag, example: AddressTag.HOME })
  @IsOptional()
  @IsEnum(AddressTag)
  tag?: AddressTag;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class UpdateEmailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'secondary@email.com' })
  @IsOptional()
  @IsEmail()
  address?: string;
}

export class UpdateLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ example: 'Instagram' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/user' })
  @IsOptional()
  @IsString()
  url?: string;
}

export class UpdateUserDto {
  
  @ApiPropertyOptional({ description: 'Nome completo do usuário' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Email principal do usuário (Login)' })
  @IsOptional()
  @IsEmail()
  @Length(1, 100)
  email?: string;

  @ApiPropertyOptional({ description: 'CPF do usuário' })
  @IsOptional()
  @IsString()
  cpf?: string;

  @ApiPropertyOptional({ description: 'Nova senha (será hasheada)' })
  @IsOptional()
  @IsString()
  @Length(8, 100)
  password?: string;

  @ApiPropertyOptional({ description: 'UUID da role' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [UpdatePhoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePhoneDto)
  phones?: UpdatePhoneDto[];

  @ApiPropertyOptional({ type: [UpdateAddressDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateAddressDto)
  addresses?: UpdateAddressDto[];

  @ApiPropertyOptional({ type: [UpdateLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateLinkDto)
  links?: UpdateLinkDto[];
}
