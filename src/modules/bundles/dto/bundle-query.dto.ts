import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { PricingType } from '../schemas/bundle.schema.js';

export class BundleQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsBoolean()
  isActive: boolean;
  @IsOptional() @IsEnum(PricingType) pricingType?: PricingType;
}
