import { PartialType } from '@nestjs/mapped-types';
import { CreateSubEntityDto } from './create-sub-entity.dto.js';

export class UpdateSubEntityDto extends PartialType(CreateSubEntityDto) {}