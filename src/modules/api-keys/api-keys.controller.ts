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
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller('api')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  // POST /api/:instanceId/create-api-keys  ("Create token" button)
  @Post(':instanceId/create-api-keys')
  create(
    @Param('instanceId', ParseObjectIdPipe) instanceId: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.create(instanceId, dto, {
      sub: user.sub,
      role: user.role,
    });
  }

  // GET /api/:instanceId/api-keys
  @Get(':instanceId/api-keys')
  findByInstance(
    @Param('instanceId', ParseObjectIdPipe) instanceId: string,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.findByInstance(instanceId, {
      sub: user.sub,
      role: user.role,
    });
  }

  // PATCH /api/regenerate-api-key/:id  (:id = pazhaya key id)
  @Patch('regenerate-api-key/:id')
  regenerate(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.regenerate(id, dto, {
      sub: user.sub,
      role: user.role,
    });
  }

  // DELETE /api/keys/:id
  @Delete('keys/:id')
  revoke(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.apiKeysService.revoke(id, {
      sub: user.sub,
      role: user.role,
    });
  }
}
