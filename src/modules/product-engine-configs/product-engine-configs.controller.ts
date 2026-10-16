import {
  Body,
  Controller,
  Delete,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { ProductEngineConfigsService } from './product-engine-configs.service.js';
import { CreateEngineConfigDto } from './dto/create-engine-config.dto.js';
import { UpdateEngineConfigDto } from './dto/update-engine-config.dto.js';
import { SaveSignalsDto } from './dto/save-signals.dto.js';
import { QueryEngineConfigDto } from './dto/query-engine-config.dto.js';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

import type { EngineConfigDocument } from './schemas/engine-config.schema.js';
import type { PaginatedEngineConfigsResponse } from './product-engine-configs.service.js';

// Restrict all endpoints in this controller to administrators.
@Roles(Role.ADMIN)
@Controller('product-engine-configs')
export class ProductEngineConfigsController {
  constructor(private readonly service: ProductEngineConfigsService) {}

  // Create a new product engine configuration.
  // Validate the request body using CreateEngineConfigDto.
  // Store the current user's ID as the creator and updater.
  @ResponseMessage('Engine configuration created successfully')
  @Post('create-config')
  create(
    @Body() dto: CreateEngineConfigDto,
    @CurrentUser() user: { sub: string },
  ): Promise<EngineConfigDocument> {
    return this.service.create(dto, user.sub);
  }

  // Get active engine configurations with pagination and search.
  // QueryEngineConfigDto contains optional filters such as search,
  // providerId, and offerType.
  // Default page is 1 and default limit is 10.
  // ParseIntPipe rejects non-integer query values.
  @ResponseMessage('Engine configurations fetched successfully')
  @Get('get-all-configs')
  findAllConfigs(
    @Query() query: QueryEngineConfigDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe)
    page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe)
    limit: number,
  ): Promise<PaginatedEngineConfigsResponse> {
    // Pass the query filters and pagination values to the service.
    return this.service.findAllConfigs({
      ...query,
      page,
      limit,
    });
  }

  // Get one active engine configuration by its MongoDB ObjectId.
  // ParseObjectIdPipe validates the ID before calling the service.
  @ResponseMessage('Engine configuration fetched successfully')
  @Get(':id/get-config')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<EngineConfigDocument> {
    return this.service.findOneConfigs(id);
  }

  // Update an existing active engine configuration.
  // Validate the request body using UpdateEngineConfigDto.
  // Record the current user's ID as the last updater.
  @ResponseMessage('Engine configuration updated successfully')
  @Patch(':id/update-config')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateEngineConfigDto,
    @CurrentUser() user: { sub: string },
  ): Promise<EngineConfigDocument> {
    return this.service.updateConfigs(id, dto, user.sub);
  }

  // Replace the configuration's signals array with the submitted signals.
  // The service validates signal IDs, required numeric fields,
  // and the fields supported by each weight type.
  // Record the current user's ID as the last updater.
  @ResponseMessage('Signals saved successfully')
  @Put(':id/save-signals')
  saveSignals(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SaveSignalsDto,
    @CurrentUser() user: { sub: string },
  ): Promise<EngineConfigDocument> {
    return this.service.saveSignals(id, dto.signals, user.sub);
  }

  // Soft-delete an engine configuration instead of permanently
  // removing it from MongoDB.
  // The service changes its status to the inactive enum value.
  // Already-inactive or nonexistent configurations return 404.
  @ResponseMessage('Engine configuration deleted successfully')
  @Delete(':id/remove-config')
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<{ deleted: boolean }> {
    return this.service.removeConfigs(id);
  }
}
