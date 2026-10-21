import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateSignalDto } from './create-signal.dto.js';

// signalId can't be changed (sameAs and configs reference it)
export class UpdateSignalDto extends PartialType(
  OmitType(CreateSignalDto, ['signalId'] as const),
) {}
