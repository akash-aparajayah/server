import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { ApiKeyMode } from '../schemas/api-key.schema.js';

export class CreateApiKeyDto {
  @IsString() @MinLength(1)
  projectId: string;

  @IsString() @MinLength(1)
  environmentId: string;

  @IsOptional() @IsString()
  note?: string;

  @IsEnum(ApiKeyMode)
  mode: ApiKeyMode;

  @IsOptional() @IsInt() @Min(1) @Max(3650)
  expiresInDays?: number;
}