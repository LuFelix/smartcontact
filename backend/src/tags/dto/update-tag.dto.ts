import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RedirectMode, TechnologyType, ApplicationType } from '../entities/tag.entity';

export class UpdateTagDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: TechnologyType })
  @IsOptional()
  @IsEnum(TechnologyType)
  technologyType?: TechnologyType;

  @ApiPropertyOptional({ enum: ApplicationType })
  @IsOptional()
  @IsEnum(ApplicationType)
  applicationType?: ApplicationType;

  @ApiPropertyOptional()
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
