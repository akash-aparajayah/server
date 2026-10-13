import { PartialType } from '@nestjs/mapped-types';
import { CreateBundleDto } from './create-bundle.dto.js';

export class UpdateBundleDto extends PartialType(CreateBundleDto) {}