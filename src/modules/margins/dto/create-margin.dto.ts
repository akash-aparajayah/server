import { IsEnum, IsMongoId, IsNumber, Min } from 'class-validator';
import { MarkupType } from '../schemas/margin.schema.js';

export class CreateMarginDto {
  @IsMongoId()
  product: string;

  @IsNumber()
  @Min(0.01) 
  wholesalePrice: number;

  @IsNumber()
  @Min(0)
  retailPrice: number;

  @IsEnum(MarkupType)
  markupType: MarkupType;

  @IsNumber()
  @Min(0)
  markupValue: number;
  
  @IsNumber()
  @Min(0)
  marginVsRetail: number;
}
