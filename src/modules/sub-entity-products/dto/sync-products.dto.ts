import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { MarkupType } from '../../margins/schemas/margin.schema.js';

export class MarginInputDto {
  @IsNumber() @Min(0.01) wholesalePrice: number;
  @IsEnum(MarkupType) markupType: MarkupType;
  @IsNumber() @Min(0) markupValue: number;
}

export class SelectedProductDto {
  @IsMongoId() product: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MarginInputDto)
  margin?: MarginInputDto;
}

export class SyncProductsDto {
  // empty array = remove all products
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SelectedProductDto)
  items: SelectedProductDto[];
}
