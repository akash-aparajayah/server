// Stripe module: wires the controller and service, and imports the API-key and Settings modules.
import { Module } from '@nestjs/common';
import { StripeController } from './stripe.controller.js';
import { StripeService } from './stripe.service.js';
import { ApiKeysModule } from '../api-keys/api-keys.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { HistoryModule } from '../history/history.module.js';

@Module({
    imports: [ApiKeysModule, SettingsModule, HistoryModule],
    controllers: [StripeController],
    providers: [StripeService],
})
export class StripeModule { }