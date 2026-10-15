import { PartialType } from '@nestjs/mapped-types';
import { CreateEntityDto } from './create-entity.dto.js';

export class UpdateEntityDto extends PartialType(CreateEntityDto) {}