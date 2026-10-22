import { PartialType } from '@nestjs/mapped-types';
import { CreateProductTemplateDto } from './create-product-template.dto.js';

export class UpdateProductTemplateDto extends PartialType(
    CreateProductTemplateDto,
) { }