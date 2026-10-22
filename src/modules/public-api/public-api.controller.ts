import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SubEntitiesService } from '../sub-entities/sub-entities.service.js';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard.js';
import type { ApiKeyContext } from '../../common/interfaces/api-key-context.interface.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('public')
export class PublicApiController {
    constructor(private readonly subEntities: SubEntitiesService) { }

    // GET /public/products  (header: x-api-key)
    @Public() // skips the login-token guard
    @UseGuards(ApiKeyGuard) // checks key, active, expiry, environment
    @ResponseMessage('Products fetched successfully')
    @Get('products')
    async products(@Req() req: Request & { apiKey: ApiKeyContext }) {
        const { subEntityId, type } = req.apiKey;
        const items = await this.subEntities.findProductsForApiKey(subEntityId);
        return { type, subEntityId, total: items.length, items };
    }
}