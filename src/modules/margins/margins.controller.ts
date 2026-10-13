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
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { Role } from '../../common/enums/role.enum.js';

@Roles(Role.ADMIN)
@Controller('margins')
export class MarginsController {
  constructor(private readonly marginsService: MarginsService) {}

  @Post()
  create(@Body() dto: CreateMarginDto, @CurrentUser() user: any) {
    return this.marginsService.create(dto, user.sub);
  }

  @Get()
  findAll() {
    return this.marginsService.findAll();
  }

  // ':id' ku munnadi irukkanum
  @Get('product/:productId')
  findByProduct(@Param('productId', ParseObjectIdPipe) productId: string) {
    return this.marginsService.findByProduct(productId);
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.marginsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateMarginDto,
    @CurrentUser() user: any,
  ) {
    return this.marginsService.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.marginsService.remove(id);
  }
}
