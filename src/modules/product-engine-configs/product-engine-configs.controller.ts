import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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

@Roles(Role.ADMIN)
@Controller('product-engine-configs')
export class ProductEngineConfigsController {
  constructor(private readonly service: ProductEngineConfigsService) {}

  @ResponseMessage('Engine configuration created successfully')
  @Post('create-config')
  create(@Body() dto: CreateEngineConfigDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.sub);
  }

  @ResponseMessage('Engine configurations fetched successfully')
  @Get('get-all-configs')
  findAll(@Query() query: QueryEngineConfigDto) {
    return this.service.findAll(query);
  }

  @ResponseMessage('Engine configuration fetched successfully')
  @Get(':id/get-config')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @ResponseMessage('Engine configuration updated successfully')
  @Patch(':id/update-config')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateEngineConfigDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  // "Save Signals" button
  @ResponseMessage('Signals saved successfully')
  @Put(':id/save-signals')
  saveSignals(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SaveSignalsDto,
    @CurrentUser() user: any,
  ) {
    return this.service.saveSignals(id, dto.signals, user.sub);
  }

  @ResponseMessage('Engine configuration deleted successfully')
  @Delete(':id/remove-config')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(id);
  }
}
