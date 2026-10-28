import { Controller, Get, Query } from '@nestjs/common';
import { CustomersService } from './customers.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

@Controller('customers')
export class CustomersController {
    constructor(private readonly svc: CustomersService) { }

    // GET /customers?mode=&search=&page=&limit=
    @ResponseMessage('Customers fetched successfully')
    @Get()
    list(
        @CurrentUser() user: any,
        @Query('mode') mode?: string,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.svc.list({ sub: user.sub, role: user.role }, { mode, search, page, limit });
    }
}