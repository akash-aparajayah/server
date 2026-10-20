import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class CategoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsOptional()
  @IsBoolean()
  isActive: boolean;
}
