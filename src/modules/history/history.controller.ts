import { Controller, Get, Param, Query } from '@nestjs/common';
import { HistoryService } from './history.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';

@Controller('history')
export class HistoryController {
    constructor(private readonly history: HistoryService) { }

    // GET /history/clients
    @ResponseMessage('History clients fetched successfully')
    @Get('clients')
    clients(@CurrentUser() user: any) {
        return this.history.clients({ sub: user.sub, role: user.role });
    }

    // GET /history/clients/:entityId/environments
    @ResponseMessage('History environments fetched successfully')
    @Get('clients/:entityId/environments')
    environments(
        @Param('entityId', ParseObjectIdPipe) entityId: string,
        @CurrentUser() user: any,
    ) {
        return this.history.environments(entityId, { sub: user.sub, role: user.role });
    }

    // GET /history?subEntityId=&env=&action=&status=&from=&to=&page=&limit=
    @ResponseMessage('History fetched successfully')
    @Get()
    list(
        @CurrentUser() user: any,
        @Query('subEntityId', ParseObjectIdPipe) subEntityId: string,
        @Query('env') env?: string,
        @Query('action') action?: string,
        @Query('status') status?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.history.list(
            { sub: user.sub, role: user.role },
            { subEntityId, env, action, status, from, to, page, limit },
        );
    }

    // GET /history/:id (keep this last)
    @ResponseMessage('History record fetched successfully')
    @Get(':id')
    findOne(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
        return this.history.findOne(id, { sub: user.sub, role: user.role });
    }
}