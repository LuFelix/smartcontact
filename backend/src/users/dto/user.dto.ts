// users/dto/user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, Length, Matches, IsOptional, IsArray, IsBoolean, IsEnum, ValidateNested } from 'class-validator';
import { IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { AddressTag } from '../entities/address.entity';

export class CreatePhoneDto {
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
  @ApiProperty({ example: 'secondary@email.com' })
  @IsEmail()
  address!: string;
}

export class CreateUserDto {
 
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ type: [CreateEmailDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEmailDto)
  secondaryEmails?: CreateEmailDto[];

  @ApiProperty({ example: '12345678900' })
  @IsOptional() 
  @IsString()
  @Length(11, 11)
  cpf?: string;

  @ApiProperty({ required: false, example: 'uuid-here' })
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiProperty({
    example: 'Senha@123',
    description: 'Senha com letras minúsculas, maiúsculas, números e caractere especial',
  })
  @IsString()
  @Matches(/(?=.*[a-z])/, { message: 'Deve conter letra minúscula' })
  @Matches(/(?=.*[A-Z])/, { message: 'Deve conter letra maiúscula' })
  @Matches(/(?=.*\d)/, { message: 'Deve conter número' })
  @Matches(/(?=.*[\W_])/, { message: 'Deve conter caractere especial' })
  @Length(8, 100)
  password!: string;

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
}
