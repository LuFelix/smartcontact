import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({ description: 'ID Token from Google' })
  @IsString()
  @IsNotEmpty()
  token!: string; 

  @ApiPropertyOptional({ description: 'Access Token from Google for People API' })
  @IsOptional()
  @IsString()
  accessToken?: string;
}
