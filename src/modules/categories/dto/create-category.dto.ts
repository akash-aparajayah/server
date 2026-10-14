import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { Status } from '../../../common/enums/status.enum.js';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and hyphens',
  })
  slug: string;

  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'backgroundColor must be a HEX code, e.g. #000000' })
  backgroundColor?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  status?: Boolean;
}
