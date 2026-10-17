import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service.js';
import type { ApiKeyDocument } from './schemas/api-key.schema.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { RegenerateApiKeyDto } from './dto/regenerate-api-key.dto.js';
import type {
  ApiKeyCreateResponse,
  ApiKeyRevokeResponse,
} from './interfaces/api-key-response.interface.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller('api')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  // POST /api/:subEntityId/create-api-keys
  // body: { type: 'live' | 'sandbox', note?, expiresInDays? }
  @ResponseMessage('API key created. Copy it now, it will not be shown again')
  @Post(':subEntityId/create-api-keys')
  async create(
    @Param('subEntityId', ParseObjectIdPipe) subEntityId: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: any,
  ): Promise<ApiKeyCreateResponse> {
    return this.apiKeysService.create(subEntityId, dto, {
      sub: user.sub,
      role: user.role,
    });
  }

  // GET /api/:subEntityId/api-keys
  @ResponseMessage('API keys fetched successfully')
  @Get(':subEntityId/api-keys')
  async findByEntity(
    @Param('subEntityId', ParseObjectIdPipe) subEntityId: string,
    @CurrentUser() user: any,
  ): Promise<ApiKeyDocument[]> {
    return this.apiKeysService.findByEntity(subEntityId, {
      sub: user.sub,
      role: user.role,
    });
  }

  // PATCH /api/regenerate-api-key/:id  (same document is overwritten)
  // body: { expiresInDays (required), note? }
  @ResponseMessage(
    'API key regenerated. Copy it now, it will not be shown again',
  )
  @Patch('regenerate-api-key/:id')
  async regenerate(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: RegenerateApiKeyDto,
    @CurrentUser() user: any,
  ): Promise<ApiKeyCreateResponse> {
    return this.apiKeysService.regenerate(id, dto, {
      sub: user.sub,
      role: user.role,
    });
  }

  // DELETE /api/keys/:id
  @ResponseMessage('API key revoked successfully')
  @Delete('keys/:id')
  async revoke(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<ApiKeyRevokeResponse> {
    return this.apiKeysService.revoke(id, { sub: user.sub, role: user.role });
  }
}
