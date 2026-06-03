// users/dto/user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsArray, IsBoolean, IsEnum, ValidateNested, IsUUID, Matches, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressTag } from '../entities/address.entity';

export class CreatePhoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: '11987654321' })
  @IsString()
  @Length(8, 20)
  number!: string;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isWhatsapp?: boolean;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class CreateAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  street!: string;

  @ApiProperty({ example: '123' })
  @IsString()
  number!: string;

  @ApiProperty({ example: 'Apto 45', required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  neighborhood!: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @Length(2, 2)
  state!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @Length(8, 10)
  zipCode!: string;

  @ApiProperty({ enum: AddressTag, example: AddressTag.HOME })
  @IsEnum(AddressTag)
  tag!: AddressTag;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}

export class CreateEmailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'secondary@email.com' })
  @IsEmail()
  address!: string;
}

export class CreateLinkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ example: 'Instagram' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'https://instagram.com/user' })
  @IsString()
  url!: string;
}

export class CreateUserDto {
 
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'joao@email.com', required: false })
  @IsEmail({}, { message: 'Formato de e-mail inválido' })
  @IsOptional()
  email?: string;

  @ApiProperty({ type: [CreateEmailDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEmailDto)
  secondaryEmails?: CreateEmailDto[];

  @ApiProperty({ example: '12345678900' })
  @IsOptional() 
  @IsString()
  cpf?: string;

  @ApiProperty({ required: false, example: 'uuid-here' })
  @IsOptional()
  @IsUUID()
  roleId?: string | null;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: 'Senha@123',
    description: 'Senha com letras minúsculas, maiúsculas, números e caractere especial',
  })
  @IsString()
  @Matches(/(?=.*[a-z])/, { message: 'Deve conter letra minúscula' })
  @Matches(/(?=.*[A-Z])/, { message: 'Deve conter letra maiúscula' })
  @Matches(/(?=.*\d)/, { message: 'Deve conter número' })
  @Matches(/(?=.*[\W_])/, { message: 'Deve conter caractere especial' })
  @Length(0, 100) // Permitir vazio para contatos importados
  @IsOptional()
  password?: string;

  @ApiProperty({ type: [CreatePhoneDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePhoneDto)
  phones?: CreatePhoneDto[];

  @ApiProperty({ type: [CreateAddressDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses?: CreateAddressDto[];

  @ApiProperty({ type: [CreateLinkDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLinkDto)
  links?: CreateLinkDto[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  tags?: any[];
}
