import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  ValidateNested,
} from 'class-validator';
import { MarginInputDto } from './sync-products.dto.js';

export class MarginItemDto {
  @IsMongoId() product: string;

  @ValidateNested()
  @Type(() => MarginInputDto)
  margin: MarginInputDto;
}

export class UpdateMarginsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => MarginItemDto)
  items: MarginItemDto[];
}
