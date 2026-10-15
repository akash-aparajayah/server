import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { Status } from '../../../common/enums/status.enum.js';

export class CreateEntityDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}