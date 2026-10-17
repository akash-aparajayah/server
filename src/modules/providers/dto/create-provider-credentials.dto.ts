import {
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateProviderCredentialsDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  apiUrl: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  tokenUrl: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  clientId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  clientSecret: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  refreshToken: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  instanceUrl: string;
}