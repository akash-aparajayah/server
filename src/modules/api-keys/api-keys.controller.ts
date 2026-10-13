import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service.js';
import { CreateApiKeyDto } from './dto/create-api-key.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  // "Create token" button
  @Post('instances/:instanceId/api-keys')
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

  @Get('instances/:instanceId/api-keys')
  findByInstance(
    @Param('instanceId', ParseObjectIdPipe) instanceId: string,
    @CurrentUser() user: any,
  ) {
    return this.apiKeysService.findByInstance(instanceId, {
      sub: user.sub,
      role: user.role,
    });
  }

  @Delete('api-keys/:id')
  revoke(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.apiKeysService.revoke(id, { sub: user.sub, role: user.role });
  }
}
