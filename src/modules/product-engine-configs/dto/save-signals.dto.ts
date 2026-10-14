import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { SignalDto } from './create-engine-config.dto.js';

export class SaveSignalsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SignalDto)
  signals: SignalDto[];
}
