import { IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Status } from '../../common/enums/status.enum.js';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'backgroundColor must be a HEX code, e.g. #000000' })
  backgroundColor?: string;

  @IsEnum(Status)
  status: Status;
}