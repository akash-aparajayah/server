import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// type cannot be changed on regenerate (it is read from the existing document)
export class RegenerateApiKeyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  // required, so a regenerated key never silently becomes "never expires"
  @IsInt()
  @Min(1)
  expiresInDays: number;
}
