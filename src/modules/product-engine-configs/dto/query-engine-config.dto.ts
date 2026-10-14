import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Status } from '../../../common/enums/status.enum.js';

export class QueryEngineConfigDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number =
    10;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(Status) status?: Status;
  @IsOptional() @IsString() providerId?: string;
  @IsOptional() @IsString() offerType?: string;
}
