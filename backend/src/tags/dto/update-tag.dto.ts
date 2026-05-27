import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RedirectMode } from '../entities/tag.entity';

export class UpdateTagDto {
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
