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
} from '../schemas/product.schema.js';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class MarketplaceContentDto {
  @IsOptional() @IsUrl() termsUrl?: string;
  @IsOptional() @IsUrl() imageUrl?: string;
  @IsOptional()
  @Matches(HEX, { message: 'must be a hex color e.g. #000000' })
  imageBackgroundColor?: string;
  @IsOptional() @IsString() @MaxLength(300) shortDescription?: string;
  @IsOptional() @IsString() longDescription?: string;
  @IsOptional() @IsString() pricingRenewalContent?: string;
}

export class DashboardContentDto {
  @IsOptional() @IsString() template?: string;
  @IsOptional() @IsString() @MaxLength(100) title?: string;
  @IsOptional() @IsString() @MaxLength(50) callToAction?: string;
  @IsOptional() @IsString() @MaxLength(100) featureTitle?: string;
  @IsOptional() @IsString() @MaxLength(300) shortDescription?: string;
}

// Save Draft: name + category mattum required. Mathadhu publish la check aagum.
export class CreateProductDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsMongoId() category: string;
  @IsOptional() @IsMongoId() providerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MarketplaceContentDto)
  marketplace?: MarketplaceContentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DashboardContentDto)
  dashboard?: DashboardContentDto;

  @IsOptional() @IsNumber() @Min(0) retailPrice?: number;
  @IsOptional() @IsEnum(DiscountType) discountType?: DiscountType;
  @IsOptional() @IsNumber() @Min(0) discountValue?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMongoId({ each: true })
  bundled?: string[];

  @IsOptional() @IsEnum(AudienceType) audienceType?: AudienceType;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Placement, { each: true })
  placements?: Placement[];

  @IsOptional() @IsInt() @Min(1) perUserFrequencyCap?: number;

  @IsOptional() @IsEnum(PublishMode) publishMode?: PublishMode;
  @IsOptional() @Type(() => Date) @IsDate() scheduledAt?: Date | null;
  @IsOptional() @Type(() => Date) @IsDate() expiresAt?: Date | null;
}
