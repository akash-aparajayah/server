import { ArrayMaxSize, IsArray, IsMongoId } from 'class-validator';

export class SaveSubEntityProductsDto {
    @IsArray()
    @ArrayMaxSize(500)
    @IsMongoId({ each: true })
    productIds: string[];
}