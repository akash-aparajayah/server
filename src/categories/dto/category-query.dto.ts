import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { Status } from '../../common/enums/status.enum.js';

export class CategoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}