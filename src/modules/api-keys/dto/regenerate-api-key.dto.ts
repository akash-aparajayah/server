import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegenerateApiKeyDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  note?: string;

  // Require an expiry between 1 and 365 days.
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays: number;
}
