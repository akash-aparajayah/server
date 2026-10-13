import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Status } from '../../../common/enums/status.enum.js';
import { PricingType } from '../schemas/bundle.schema.js';

export class BundleQueryDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(Status) status?: Status;
  @IsOptional() @IsEnum(PricingType) pricingType?: PricingType;
}