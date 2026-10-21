import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Put,
} from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import {
  ChangePasswordDto,
  SaveColumnsDto,
  SaveGatewayDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from './dto/settings.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

enum GatewayMode {
  Sandbox = 'sandbox',
  Live = 'live',
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  // ---------- Profile (any logged-in user) ----------

  @ResponseMessage('Profile fetched successfully')
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return this.service.getProfile(user.sub);
  }

  @ResponseMessage('Profile updated successfully')
  @Patch('profile')
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: any) {
    return this.service.updateProfile(user.sub, dto);
  }

  @ResponseMessage('Password changed successfully')
  @Patch('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: any) {
    return this.service.changePassword(user.sub, dto);
  }

  // ---------- Preferences ----------

  @ResponseMessage('Preferences fetched successfully')
  @Get('preferences')
  getPreferences(@CurrentUser() user: any) {
    return this.service.getPreferences(user.sub);
  }

  @ResponseMessage('Preferences updated successfully')
  @Patch('preferences')
  updatePreferences(
    @Body() dto: UpdatePreferencesDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updatePreferences(user.sub, dto);
  }

  // ---------- Columns ----------

  @ResponseMessage('Columns fetched successfully')
  @Get('columns/:table')
  getColumns(@Param('table') table: string, @CurrentUser() user: any) {
    return this.service.getColumns(user.sub, table);
  }

  @ResponseMessage('Columns saved successfully')
  @Put('columns/:table')
  saveColumns(
    @Param('table') table: string,
    @Body() dto: SaveColumnsDto,
    @CurrentUser() user: any,
  ) {
    return this.service.saveColumns(user.sub, table, dto);
  }

  @ResponseMessage('Columns reset successfully')
  @Delete('columns/:table')
  resetColumns(@Param('table') table: string, @CurrentUser() user: any) {
    return this.service.resetColumns(user.sub, table);
  }

  // ---------- Payment gateway (admin only) ----------

  @Roles(Role.ADMIN)
  @ResponseMessage('Payment gateway fetched successfully')
  @Get('payment-gateway/:mode')
  getGateway(@Param('mode', new ParseEnumPipe(GatewayMode)) mode: GatewayMode) {
    return this.service.getGateway(mode);
  }

  @Roles(Role.ADMIN)
  @ResponseMessage('Payment gateway saved successfully')
  @Put('payment-gateway/:mode')
  saveGateway(
    @Param('mode', new ParseEnumPipe(GatewayMode)) mode: GatewayMode,
    @Body() dto: SaveGatewayDto,
    @CurrentUser() user: any,
  ) {
    return this.service.saveGateway(mode, dto, user.sub);
  }
}
