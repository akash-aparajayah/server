import { PartialType } from '@nestjs/mapped-types';
import { CreateInstanceDto } from './create-instance.dto.js';

export class UpdateInstanceDto extends PartialType(CreateInstanceDto) {}
