import { PartialType } from '@nestjs/mapped-types';
import { CreateApiDocDto } from './create-api-doc.dto.js';

export class UpdateApiDocDto extends PartialType(CreateApiDocDto) { }