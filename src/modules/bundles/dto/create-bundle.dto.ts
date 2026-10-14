import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DiscountType, PricingType } from '../schemas/bundle.schema.js';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export class BundleTemplateDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsNotEmpty() shortDescription: string;
  @IsOptional() @IsString() backgroundImage?: string;
  @IsString() @IsNotEmpty() iconFamily: string;
  @IsString() @IsNotEmpty() appIcon: string;
  @IsOptional() @IsString() webIcon?: string;
  @IsOptional()
  @Matches(HEX, { message: 'must be a hex color' })
  cardBackgroundColor?: string;
  @IsOptional()
  @Matches(HEX, { message: 'must be a hex color' })
  iconBackground?: string;
}

export class CreateBundleDto {
  // 1. Basic info
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() shortCode: string;
  @IsString() @IsNotEmpty() iconFamily: string;
  @IsString() @IsNotEmpty() appIcon: string;
  @IsOptional() @IsString() webIcon?: string;
  @IsOptional()
  @Matches(HEX, { message: 'must be a hex color' })
  backgroundColor?: string;
  @IsEnum(PricingType) pricingType: PricingType;
  @IsOptional() status?: Boolean;

  // pricing (add-on only)
  @ValidateIf((o) => o.pricingType === PricingType.AddOn)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional() @IsBoolean() hasDiscount?: boolean;

  @ValidateIf((o) => o.hasDiscount === true)
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ValidateIf((o) => o.hasDiscount === true)
  @IsNumber()
  @Min(0)
  @ValidateIf(
    (o) => o.hasDiscount === true && o.discountType === DiscountType.Percentage,
  )
  @Max(100)
  discountValue?: number;

  // 2. Client-facing content
  @IsString() @IsNotEmpty() longDescription: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional() @IsString() supportPhone?: string;
  @IsOptional() @IsUrl() websiteUrl?: string;
  @IsOptional() @IsString() promoCode?: string;
  @IsOptional() @IsString() promoCodeUsageNote?: string;
  @IsOptional() @IsString() disclosure?: string;
  @IsOptional() @IsString() disclaimer?: string;
  @IsOptional() @IsString() additionalInformation?: string;
  @IsOptional() @IsString() insuranceInstructions?: string;

  // 3. Template
  @ValidateNested()
  @Type(() => BundleTemplateDto)
  template: BundleTemplateDto;
}
