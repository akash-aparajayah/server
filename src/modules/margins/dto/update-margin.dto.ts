import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateMarginDto } from './create-margin.dto.js';

// product maathakoodathu. Venumna delete panni thirumba create pannu
export class UpdateMarginDto extends PartialType(
  OmitType(CreateMarginDto, ['product'] as const),
) {}
