import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { MarginsService } from './margins.service.js';
import { CreateMarginDto } from './dto/create-margin.dto.js';
import { UpdateMarginDto } from './dto/update-margin.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

@Roles(Role.ADMIN)
@Controller('margins')
export class MarginsController {
  constructor(private readonly marginsService: MarginsService) {}

  @ResponseMessage('Margin created successfully')
  @Post('create-margin')
  create(@Body() dto: CreateMarginDto, @CurrentUser() user: any) {
    return this.marginsService.create(dto, user.sub);
  }

  @ResponseMessage('Margins fetched successfully')
  @Get('get-all-margins')
  findAll() {
    return this.marginsService.findAll();
  }

  @ResponseMessage('Margin fetched successfully')
  @Get('product/:productId/get-margin')
  findByProduct(@Param('productId', ParseObjectIdPipe) productId: string) {
    return this.marginsService.findByProduct(productId);
  }

  @ResponseMessage('Margin fetched successfully')
  @Get(':id/get-margin')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.marginsService.findOne(id);
  }

  @ResponseMessage('Margin updated successfully')
  @Patch(':id/update-margin')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateMarginDto,
    @CurrentUser() user: any,
  ) {
    return this.marginsService.update(id, dto, user.sub);
  }

  @ResponseMessage('Margin deleted successfully')
  @Delete(':id/remove-margin')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.marginsService.remove(id);
  }
}