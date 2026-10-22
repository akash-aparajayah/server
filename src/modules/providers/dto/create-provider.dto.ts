import { plainToInstance, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ProviderMode } from '../schemas/provider.schema.js';
import { CreateProviderCredentialsDto } from './create-provider-credentials.dto.js';

// one entry of the credentials list: the 6 fields plus which mode it is
export class ProviderCredentialItemDto extends CreateProviderCredentialsDto {
  @IsEnum(ProviderMode)
  mode: ProviderMode;
}

export class CreateProviderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  // multipart sends this as a JSON string, so parse it first
  @IsOptional()
  @Transform(({ value }) => {
    let raw = value;
    if (typeof value === 'string') {
      try {
        raw = JSON.parse(value);
      } catch {
        return value; // not valid JSON: @IsArray below rejects it
      }
    }
    return Array.isArray(raw)
      ? raw.map((x) => plainToInstance(ProviderCredentialItemDto, x))
      : raw;
  })
  @IsArray()
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  credentials?: ProviderCredentialItemDto[];
}
