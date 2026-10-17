import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiKeyType } from '../schemas/api-key.schema.js';

export class CreateApiKeyDto {
  @IsEnum(ApiKeyType)
  type: ApiKeyType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}
