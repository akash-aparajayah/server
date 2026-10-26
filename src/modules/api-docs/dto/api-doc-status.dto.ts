import { IsBoolean } from 'class-validator';

export class ApiDocStatusDto {
    @IsBoolean() isActive: boolean;
}