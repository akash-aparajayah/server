import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsEnum, IsNumber, IsOptional, IsString,
  IsUrl, Matches, Max, Min, MinLength, ValidateIf, ValidateNested,
} from 'class-validator';
import { Status } from '../../common/enums/status.enum.js';
import { PricingType } from '../schemas/bundle.schema.js';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const HEX_MSG = { message: 'Must be a HEX code, e.g. #000000' };

export class CreateBundleTemplateDto {
  @IsString() @MinLength(2) title: string;
  @IsString() @MinLength(2) shortDescription: string;
  @IsOptional() @IsString() backgroundImage?: string;
  @IsString() iconFamily: string;
  @IsString() appIcon: string;
  @IsOptional() @IsString() webIcon?: string;
  @IsOptional() @Matches(HEX, HEX_MSG) cardBackgroundColor?: string;
  @IsOptional() @Matches(HEX, HEX_MSG) iconBackground?: string;
}

export class CreateBundleDto {
  @IsString() @MinLength(2) name: string;
  @IsString() @MinLength(2) shortCode: string;
  @IsString() iconFamily: string;
  @IsString() appIcon: string;
  @IsOptional() @IsString() webIcon?: string;
  @IsOptional() @Matches(HEX, HEX_MSG) backgroundColor?: string;
  @IsEnum(PricingType) pricingType: PricingType;
  @IsEnum(Status) status: Status;

  @ValidateIf((o) => o.pricingType === PricingType.AddOn)
  @IsNumber() @Min(0)
  price?: number;

  @IsOptional() @IsNumber() @Min(0) @Max(100)
  discount?: number;

  @IsString() @MinLength(1) longDescription: string;

  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true })
  benefits?: string[];

  @IsOptional() @IsString() supportPhone?: string;
  @IsOptional() @IsUrl() websiteUrl?: string;
  @IsOptional() @IsString() promoCode?: string;
  @IsOptional() @IsString() promoCodeUsageNote?: string;
  @IsOptional() @IsString() disclosure?: string;
  @IsOptional() @IsString() disclaimer?: string;
  @IsOptional() @IsString() additionalInformation?: string;
  @IsOptional() @IsString() insuranceInstructions?: string;

  @ValidateNested()
  @Type(() => CreateBundleTemplateDto)
  template: CreateBundleTemplateDto;
}