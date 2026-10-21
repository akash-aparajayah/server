import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryEngineConfigDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number =
    10;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsBoolean() status?: Boolean;
  @IsOptional() @IsString() providerId?: string;
}
