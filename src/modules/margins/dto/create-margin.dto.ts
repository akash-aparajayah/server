import { IsEnum, IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';
import { MarkupType } from '../schemas/margin.schema.js';

export class CreateMarginDto {
  @IsMongoId()
  productId: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  wholesalePrice: number;

  // only needed when the product has no price of its own
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  retailPrice?: number;

  @IsEnum(MarkupType)
  markupType: MarkupType;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  markupValue: number;
}