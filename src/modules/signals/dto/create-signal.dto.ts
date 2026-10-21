import { Type } from 'class-transformer';
import {
    IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { WeightType } from '../../product-engine-configs/schemas/engine-config.schema.js';
import { SignalMatchDto } from '../../product-engine-configs/dto/create-engine-config.dto.js';

export class CreateSignalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'signalId must be lowercase letters, numbers and underscores',
  })
  signalId: string;

  @IsString() @IsNotEmpty() @MaxLength(100) label: string;
  @IsOptional() @IsInt() @Min(0) minCount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SignalMatchDto)
  match?: SignalMatchDto;

  @IsEnum(WeightType) weightType: WeightType;

  @IsOptional() @IsNumber() weightValue?: number;
  @IsOptional() @IsNumber() cap?: number;
  @IsOptional() @IsNumber() divisor?: number;
  @IsOptional() @IsNumber() multiplier?: number;
  @IsOptional() @IsNumber() reference?: number;
  @IsOptional() @IsNumber() trigger?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
