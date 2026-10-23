import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { User, UserSchema } from '../users/schemas/user.schema.js';
import {
  UserSettings,
  UserSettingsSchema,
} from './schemas/user-settings.schema.js';
import {
  GatewayCredential,
  GatewayCredentialSchema,
} from './schemas/gateway-credential.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSettings.name, schema: UserSettingsSchema },
      { name: GatewayCredential.name, schema: GatewayCredentialSchema },
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule { }
