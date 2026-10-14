import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateEngineConfigDto } from './create-engine-config.dto.js';

export class UpdateEngineConfigDto extends PartialType(
  OmitType(CreateEngineConfigDto, ['signals'] as const),
) {}
