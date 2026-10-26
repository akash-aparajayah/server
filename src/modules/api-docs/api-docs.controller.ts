import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiDocsService } from './api-docs.service.js';
import { CreateApiDocDto } from './dto/create-api-doc.dto.js';
import { UpdateApiDocDto } from './dto/update-api-doc.dto.js';
import { ApiDocStatusDto } from './dto/api-doc-status.dto.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('api-docs')
export class ApiDocsController {
    constructor(private readonly svc: ApiDocsService) { }

    // GET /api-docs
    @ResponseMessage('Documentation fetched successfully')
    @Get()
    findAll() {
        return this.svc.findAll();
    }

    // GET /api-docs/:id
    @ResponseMessage('Documentation fetched successfully')
    @Get(':id')
    findOne(@Param('id', ParseObjectIdPipe) id: string) {
        return this.svc.findById(id);
    }

    // POST /api-docs
    @ResponseMessage('Documentation created successfully')
    @Post()
    create(@Body() dto: CreateApiDocDto, @CurrentUser() user: { sub: string }) {
        return this.svc.create(dto, user.sub);
    }

    // PATCH /api-docs/:id
    @ResponseMessage('Documentation updated successfully')
    @Patch(':id')
    update(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() dto: UpdateApiDocDto,
        @CurrentUser() user: { sub: string },
    ) {
        return this.svc.update(id, dto, user.sub);
    }

    // PATCH /api-docs/:id/status
    @ResponseMessage('Status updated successfully')
    @Patch(':id/status')
    status(
        @Param('id', ParseObjectIdPipe) id: string,
        @Body() dto: ApiDocStatusDto,
        @CurrentUser() user: { sub: string },
    ) {
        return this.svc.setStatus(id, dto.isActive, user.sub);
    }

    // DELETE /api-docs/:id
    @ResponseMessage('Documentation deleted successfully')
    @Delete(':id')
    remove(@Param('id', ParseObjectIdPipe) id: string) {
        return this.svc.remove(id);
    }
}