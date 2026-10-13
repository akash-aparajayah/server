import { IsOptional, IsString } from 'class-validator';

export class ApiKeyQueryDto {
  @IsOptional() @IsString()
  projectId?: string;
}