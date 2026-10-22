import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller.js';
import { ApiKeysModule } from '../api-keys/api-keys.module.js';
import { SubEntitiesModule } from '../sub-entities/sub-entities.module.js';

@Module({
    imports: [ApiKeysModule, SubEntitiesModule],
    controllers: [PublicApiController],
})
export class PublicApiModule { }