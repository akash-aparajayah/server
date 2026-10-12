import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateMarginDto } from './create-margin.dto.js';

export class UpdateMarginDto extends PartialType(OmitType(CreateMarginDto, ['productId'] as const)) {}