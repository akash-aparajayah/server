import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
    IsIn,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength,
    ValidateIf,
} from 'class-validator';

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// optional colour: empty string is allowed (it clears the colour)
const Hex = () =>
    applyDecorators(
        ValidateIf((_o, v) => v !== undefined && v !== ''),
        IsString(),
        Matches(HEX, { message: 'must be a valid HEX code, e.g. #000000' }),
    );

export class CreateProductTemplateDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(60)
    name: string;

    @IsIn(['active', 'inactive'])
    status: 'active' | 'inactive';

    @Hex() cardBg?: string;
    @Hex() buttonBg?: string;
    @Hex() buttonText?: string;
    @Hex() textPrimary?: string;
    @Hex() textSecondary?: string;
}