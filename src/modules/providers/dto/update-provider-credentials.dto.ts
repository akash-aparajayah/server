import { PartialType } from '@nestjs/mapped-types';
import { CreateProviderCredentialsDto } from './create-provider-credentials.dto.js';

export class UpdateProviderCredentialsDto extends PartialType(
  CreateProviderCredentialsDto,
) {}