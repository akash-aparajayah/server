import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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
import { Status } from '../../../common/enums/status.enum.js';
import { WeightType } from '../schemas/engine-config.schema.js';

// "5995, 0742" -> ["5995", "0742"]  (array vandha apdiye)
const toList = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : value;

export class SignalMatchDto {
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  topCategory?: string[];
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  code?: string[];
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  mcc?: string[];
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
  @IsOptional()
  @Transform(toList)
  @IsArray()
  @IsString({ each: true })
  flags?: string[];
  @IsOptional() @IsString() @MaxLength(100) sameAs?: string;
  @IsOptional() @IsString() @MaxLength(100) contextField?: string;
}

export class SignalDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'signalId must be lowercase letters, numbers and underscores',
  })
  signalId: string;

  @IsOptional() @IsString() @MaxLength(100) label?: string;
  @IsOptional() @IsInt() @Min(0) minCount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SignalMatchDto)
  match?: SignalMatchDto;

  @IsEnum(WeightType) weightType: WeightType;
  @IsOptional() @IsNumber() weightValue?: number;
}

export class ThresholdsDto {
  @IsNumber() show: number;
  @IsNumber() review: number;
  @IsOptional() @IsNumber() hide?: number;
}

export class CreateEngineConfigDto {
  @IsString() @IsNotEmpty() providerId: string;
  @IsString() @IsNotEmpty() offerType: string;
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsNumber() baseScore?: number;

  @ValidateNested()
  @Type(() => ThresholdsDto)
  thresholds: ThresholdsDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SignalDto)
  signals?: SignalDto[];

  @IsOptional() @IsEnum(Status) status?: Status;
}
