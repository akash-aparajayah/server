import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller('api')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  // POST /api/:entityId/create-api-keys
  @ResponseMessage('API key created. Copy it now, it will not be shown again')
  @Post(':entityId/create-api-keys')
  create(
    @Param('entityId', ParseObjectIdPipe) entityId: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.create(entityId, dto, { sub: user.sub, role: user.role });
  }

  // GET /api/:entityId/api-keys
  @ResponseMessage('API keys fetched successfully')
  @Get(':entityId/api-keys')
  findByEntity(
    @Param('entityId', ParseObjectIdPipe) entityId: string,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.findByEntity(entityId, { sub: user.sub, role: user.role });
  }

  // PATCH /api/regenerate-api-key/:id  (:id = old key id)
  @ResponseMessage('API key regenerated. Copy it now, it will not be shown again')
  @Patch('regenerate-api-key/:id')
  regenerate(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.regenerate(id, dto, { sub: user.sub, role: user.role });
  }

  // DELETE /api/keys/:id
  @ResponseMessage('API key revoked successfully')
  @Delete('keys/:id')
  revoke(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.apiKeysService.revoke(id, { sub: user.sub, role: user.role });
  }
}