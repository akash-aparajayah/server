import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RegenerateApiKeyDto {
  @IsOptional() @IsString()
  note?: string;

  @IsOptional() @IsInt() @Min(1) @Max(3650)
  expiresInDays?: number;
}