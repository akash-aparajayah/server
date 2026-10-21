import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { SignalsService } from './signals.service.js';
import type { Page } from './signals.service.js';
import type { ProductSignalDocument } from './schemas/signal.schema.js';
import { CreateSignalDto } from './dto/create-signal.dto.js';
import { UpdateSignalDto } from './dto/update-signal.dto.js';
import { QuerySignalDto } from './dto/query-signal.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

@Roles(Role.ADMIN)
@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @ResponseMessage('Signal created successfully')
  @Post('create-signal')
  create(
    @Body() dto: CreateSignalDto,
    @CurrentUser() user: any,
  ): Promise<ProductSignalDocument> {
    return this.signalsService.create(dto, user.sub);
  }

  @ResponseMessage('Signals fetched successfully')
  @Get('get-all-signals')
  findAll(
    @Query() query: QuerySignalDto,
  ): Promise<Page<ProductSignalDocument>> {
    return this.signalsService.findAll(query);
  }

  // Engine Config "Select Signal" dropdown
  @ResponseMessage('Signal options fetched successfully')
  @Get('get-signal-options')
  options(): Promise<ProductSignalDocument[]> {
    return this.signalsService.options();
  }

  @ResponseMessage('Signal fetched successfully')
  @Get(':id/get-signal')
  findOne(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ProductSignalDocument> {
    return this.signalsService.findOne(id);
  }

  @ResponseMessage('Signal updated successfully')
  @Patch(':id/update-signal')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateSignalDto,
    @CurrentUser() user: any,
  ): Promise<ProductSignalDocument> {
    return this.signalsService.update(id, dto, user.sub);
  }

  @ResponseMessage('Signal deleted successfully')
  @Delete(':id/remove-signal')
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() user: any,
  ): Promise<{ deleted: boolean }> {
    return this.signalsService.remove(id, user.sub);
  }
}
