import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

import { DiscountType } from '../../../common/enums/discount-type.enum.js';

import {
  AudienceType,
  Placement,
  PublishMode,
  MarkupType,
} from '../schemas/product.schema.js';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class MarketplaceContentDto {
  @IsOptional()
  @IsUrl()
  termsUrl?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @Matches(HEX, { message: 'must be a hex color e.g. #000000' })
  imageBackgroundColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDescription?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsString()
  pricingRenewalContent?: string;
}

export class DashboardContentDto {
  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  callToAction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  featureTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shortDescription?: string;
}

// Save Draft: name + category mattum required.
// Publish time-la remaining required fields validate pannalam.
export class CreateProductDto {
  // Step 1: Overview
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsMongoId()
  category: string;

  @IsOptional()
  @IsMongoId()
  providerId?: string;

  // Step 2: Content
  @IsOptional()
  @ValidateNested()
  @Type(() => MarketplaceContentDto)
  marketplace?: MarketplaceContentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DashboardContentDto)
  dashboard?: DashboardContentDto;

  // Step 3: Pricing
  @IsOptional()
  @IsNumber()
  @Min(0)
  retailPrice?: number;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  // Step 3: Margin fields
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @IsOptional()
  @IsEnum(MarkupType)
  markupType?: MarkupType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  markupValue?: number;

  // Bundle references
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  bundled?: string[];

  // Step 4: Audience
  @IsOptional()
  @IsEnum(AudienceType)
  audienceType?: AudienceType;

  @IsOptional()
  @IsMongoId()
  configurationId?: string;

  // Step 5: Placement
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Placement, { each: true })
  placements?: Placement[];

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserFrequencyCap?: number;

  // Publishing
  @IsOptional()
  @IsEnum(PublishMode)
  publishMode?: PublishMode;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;
}
