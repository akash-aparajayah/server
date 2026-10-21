import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CURRENCIES,
  DATE_FORMATS,
  LANGUAGES,
  THEMES,
  TIME_ZONES,
} from '../settings.constants.js';

// ---------- Profile ----------
export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;

  @IsOptional()
  @Matches(/^[0-9+\-\s()]{7,20}$/, { message: 'phone is not valid' })
  phone?: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) @MaxLength(72) newPassword: string;
}

// ---------- Preferences ----------
export class UpdatePreferencesDto {
  @IsOptional() @IsIn(THEMES) theme?: string;
  @IsOptional() @IsIn(LANGUAGES) language?: string;
  @IsOptional() @IsIn(CURRENCIES) currency?: string;
  @IsOptional() @IsIn(DATE_FORMATS) dateFormat?: string;
  @IsOptional() @IsIn(TIME_ZONES) timeZone?: string;
}

// ---------- Columns ----------
export class ColumnItemDto {
  @IsString() @IsNotEmpty() key: string;
  @IsBoolean() visible: boolean;
}

export class SaveColumnsDto {
  // array order = display order
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ColumnItemDto)
  columns: ColumnItemDto[];
}

// ---------- Payment gateway ----------
export class SaveGatewayDto {
  @IsString() @IsNotEmpty() @MaxLength(200) publishableKey: string;

  // optional on edit: empty = keep the old secret
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(300) secretKey?: string;
}
