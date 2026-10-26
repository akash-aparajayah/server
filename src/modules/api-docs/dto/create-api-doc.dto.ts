import { Type } from 'class-transformer';
import {
    ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty,
    IsOptional, IsString, MaxLength, ValidateNested,
} from 'class-validator';
import { DocMethod } from '../schemas/api-doc.schema.js';

class HeaderDto {
    @IsString() @IsNotEmpty() @MaxLength(100) field: string;
    @IsOptional() @IsString() @MaxLength(30) type?: string;
    @IsOptional() @IsString() @MaxLength(500) details?: string;
}
class BodyFieldDto {
    @IsString() @IsNotEmpty() @MaxLength(100) field: string;
    @IsOptional() @IsString() @MaxLength(30) type?: string;
    @IsOptional() @IsBoolean() required?: boolean;
    @IsOptional() @IsString() @MaxLength(500) details?: string;
}
class ResponseDto {
    @IsString() @IsNotEmpty() @MaxLength(10) code: string;
    @IsOptional() @IsString() @MaxLength(200) subject?: string;
    @IsOptional() @IsString() @MaxLength(1000) details?: string;
}

export class CreateApiDocDto {
    @IsString() @IsNotEmpty() @MaxLength(100) name: string;
    @IsEnum(DocMethod) method: DocMethod;
    @IsOptional() @IsString() @MaxLength(100) service?: string;
    @IsString() @IsNotEmpty() @MaxLength(500) url: string;
    @IsOptional() @IsString() @MaxLength(1000) description?: string;

    @IsOptional() @IsMongoId() providerId?: string | null; // null = General

    @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => HeaderDto)
    headers?: HeaderDto[];
    @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => BodyFieldDto)
    body?: BodyFieldDto[];
    @IsOptional() @IsArray() @ArrayMaxSize(50) @ValidateNested({ each: true }) @Type(() => ResponseDto)
    responses?: ResponseDto[];

    @IsOptional() @IsString() @MaxLength(10000) requestExample?: string;
    @IsOptional() @IsString() @MaxLength(10000) responseExample?: string;
    @IsOptional() @IsBoolean() isActive?: boolean;
}