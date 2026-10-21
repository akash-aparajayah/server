import { Body, Controller, Get, Param, Patch, Put } from '@nestjs/common';
import { SubEntityProductsService } from './sub-entity-products.service.js';
import { SyncProductsDto } from './dto/sync-products.dto.js';
import { UpdateMarginsDto } from './dto/update-margins.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller('sub-entity-products')
export class SubEntityProductsController {
  constructor(private readonly service: SubEntityProductsService) {}

  @ResponseMessage('Summary fetched successfully')
  @Get(':subEntityId/get-summary')
  summary(
    @Param('subEntityId', ParseObjectIdPipe) subEntityId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.summary(subEntityId, {
      sub: user.sub,
      role: user.role,
    });
  }

  @ResponseMessage('Products fetched successfully')
  @Get(':subEntityId/get-product-picker')
  picker(
    @Param('subEntityId', ParseObjectIdPipe) subEntityId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.picker(subEntityId, { sub: user.sub, role: user.role });
  }

  // select products + margin in one call
  @ResponseMessage('Products saved successfully')
  @Put(':subEntityId/sync-products')
  sync(
    @Param('subEntityId', ParseObjectIdPipe) subEntityId: string,
    @Body() dto: SyncProductsDto,
    @CurrentUser() user: any,
  ) {
    return this.service.sync(subEntityId, dto, {
      sub: user.sub,
      role: user.role,
    });
  }

  @ResponseMessage('Selected products fetched successfully')
  @Get(':subEntityId/get-selected-products')
  findSelected(
    @Param('subEntityId', ParseObjectIdPipe) subEntityId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findSelected(subEntityId, {
      sub: user.sub,
      role: user.role,
    });
  }

  @ResponseMessage('Margins updated successfully')
  @Patch(':subEntityId/update-margins')
  updateMargins(
    @Param('subEntityId', ParseObjectIdPipe) subEntityId: string,
    @Body() dto: UpdateMarginsDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateMargins(subEntityId, dto, {
      sub: user.sub,
      role: user.role,
    });
  }
}
