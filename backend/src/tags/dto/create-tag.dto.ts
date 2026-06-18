import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TechnologyType, ApplicationType, RedirectMode } from '../entities/tag.entity';

export class CreateTagDto {
  @ApiPropertyOptional({ description: 'O ID físico gravado no hardware (UID NFC ou EPC RFID)' })
  @IsOptional()
  @IsString()
  uid?: string;

  @ApiProperty({ description: 'Nome amigável para a Tag' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: TechnologyType })
  @IsEnum(TechnologyType)
  technologyType!: TechnologyType;

  @ApiProperty({ enum: ApplicationType })
  @IsEnum(ApplicationType)
  applicationType!: ApplicationType;

  @ApiPropertyOptional({ description: 'URL de destino ou identificador MAS' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ enum: RedirectMode })
  @IsOptional()
  @IsEnum(RedirectMode)
  nfcRedirectMode?: RedirectMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nfcCustomUrl?: string;

  @ApiPropertyOptional({ enum: RedirectMode })
  @IsOptional()
  @IsEnum(RedirectMode)
  qrRedirectMode?: RedirectMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCustomUrl?: string;
}
