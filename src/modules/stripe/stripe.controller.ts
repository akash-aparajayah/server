// Public payment endpoints (POST /public/payments/*): protected by x-api-key, mode (sandbox/live) comes from the key.
import { Body, Controller, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService, type Mode } from './stripe.service.js';
import * as D from './dto/stripe.dto.js';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard.js';
import { HistoryInterceptor } from '../history/history.interceptor.js';
import type { ApiKeyContext } from '../../common/interfaces/api-key-context.interface.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';

type Req = Request & { apiKey: ApiKeyContext };
const mode = (req: Req) => String(req.apiKey.type) as Mode; // sandbox or live, from the API key

@Public() // skips the login-token guard
@UseGuards(ApiKeyGuard) // x-api-key: key, expiry, environment
@UseInterceptors(HistoryInterceptor) // saves every call to History
@Controller('api/payment')
export class StripeController {
    constructor(private readonly svc: StripeService) { }

    // Creates a Stripe customer. Body: { data: { email, name, ... } }
    @ResponseMessage('Customer created')
    @Post('create-customer')
    createCustomer(@Req() r: Req, @Body() d: D.StripeDataDto) {
        return this.svc.createCustomer(mode(r), d);
    }

    // Updates a customer. Body: { id: "cus_...", data: { ... } }
    @ResponseMessage('Customer updated')
    @Post('update-customer')
    updateCustomer(@Req() r: Req, @Body() d: D.StripeUpdateDto) {
        return this.svc.updateCustomer(mode(r), d);
    }

    // Creates a product. Body: { data: { name, ... } }
    @ResponseMessage('Product created')
    @Post('create-product')
    createProduct(@Req() r: Req, @Body() d: D.StripeDataDto) {
        return this.svc.createProduct(mode(r), d);
    }

    // Updates a product. Body: { id: "prod_...", data: { ... } }
    @ResponseMessage('Product updated')
    @Post('update-product')
    updateProduct(@Req() r: Req, @Body() d: D.StripeUpdateDto) {
        return this.svc.updateProduct(mode(r), d);
    }

    // Creates a plan (older Stripe API, prefer prices). Body: { data: { ... } }
    @ResponseMessage('Plan created')
    @Post('create-plan')
    createPlan(@Req() r: Req, @Body() d: D.StripeDataDto) {
        return this.svc.createPlan(mode(r), d);
    }

    // Updates a plan. Body: { id: "plan_...", data: { ... } }
    @ResponseMessage('Plan updated')
    @Post('update-plan')
    updatePlan(@Req() r: Req, @Body() d: D.StripeUpdateDto) {
        return this.svc.updatePlan(mode(r), d);
    }

    // Creates a price. Body: { data: { product, unit_amount, currency, recurring? } }
    @ResponseMessage('Price created')
    @Post('create-price')
    createPrice(@Req() r: Req, @Body() d: D.StripeDataDto) {
        return this.svc.createPrice(mode(r), d);
    }

    // Updates a price. Body: { id: "price_...", data: { ... } }
    @ResponseMessage('Price updated')
    @Post('update-price')
    updatePrice(@Req() r: Req, @Body() d: D.StripeUpdateDto) {
        return this.svc.updatePrice(mode(r), d);
    }

    // Attaches a card to a customer. Body: { paymentMethodId, customerId }
    @ResponseMessage('Card attached')
    @Post('attach-card')
    attachCard(@Req() r: Req, @Body() d: D.AttachCardDto) {
        return this.svc.attachCard(mode(r), d);
    }

    // Detaches a card from its customer. Body: { paymentMethodId }
    @ResponseMessage('Card detached')
    @Post('detach-card')
    detachCard(@Req() r: Req, @Body() d: D.DetachCardDto) {
        return this.svc.detachCard(mode(r), d);
    }

    // Creates a setup intent to save a card or bank account. Body: { customerId, paymentMethodTypes? }
    @ResponseMessage('Setup intent created')
    @Post('create-setup-intent')
    createSetupIntent(@Req() r: Req, @Body() d: D.SetupIntentDto) {
        return this.svc.createSetupIntent(mode(r), d);
    }

    // Verifies a bank account with two micro-deposit amounts. Body: { setupIntentId, amounts: [32, 45] }
    @ResponseMessage('Setup intent verified')
    @Post('verify-setup-intent')
    verifySetupIntent(@Req() r: Req, @Body() d: D.VerifySetupDto) {
        return this.svc.verifySetupIntent(mode(r), d);
    }

    // Creates a connected account (needs Stripe Connect). Body: { data: { ... } }
    @ResponseMessage('Account created')
    @Post('create-account')
    createAccount(@Req() r: Req, @Body() d: D.StripeDataDto) {
        return this.svc.createAccount(mode(r), d);
    }

    // Fetches a connected account. Body: { accountId }
    @ResponseMessage('Account fetched')
    @Post('retrieve-account')
    retrieveAccount(@Req() r: Req, @Body() d: D.AccountIdDto) {
        return this.svc.retrieveAccount(mode(r), d);
    }

    // Adds a bank account or card to a connected account. Body: { accountId, data: { ... } }
    @ResponseMessage('External account created')
    @Post('create-external-account')
    createExternalAccount(@Req() r: Req, @Body() d: D.ExternalAccountDto) {
        return this.svc.createExternalAccount(mode(r), d);
    }

    // Creates an onboarding link for a connected account. Body: { accountId, refreshUrl, returnUrl }
    @ResponseMessage('Account link created')
    @Post('create-account-link')
    createAccountLink(@Req() r: Req, @Body() d: D.AccountLinkDto) {
        return this.svc.createAccountLink(mode(r), d);
    }

    // Transfers money to a connected account. Body: { amount (cents), destination, currency?, metadata? }
    @ResponseMessage('Transfer created')
    @Post('create-transfer')
    createTransfer(@Req() r: Req, @Body() d: D.TransferDto) {
        return this.svc.createTransfer(mode(r), d);
    }

    // Pays out a connected account's balance to its bank. Body: { amount (cents), accountId, advanceId? }
    @ResponseMessage('Payout created')
    @Post('create-payout')
    createPayout(@Req() r: Req, @Body() d: D.PayoutDto) {
        return this.svc.createPayout(mode(r), d);
    }

    // Starts a subscription (customer needs a default card). Body: { customerId, priceId }
    @ResponseMessage('Subscription created')
    @Post('create-subscription')
    createSubscription(@Req() r: Req, @Body() d: D.SubscriptionDto) {
        return this.svc.createSubscription(mode(r), d);
    }

    // Charges a saved card once. Body: { amount (cents), customerId, paymentMethodId, idempotencyKey? }
    @ResponseMessage('Payment created')
    @Post('create-payment')
    createPayment(@Req() r: Req, @Body() d: D.PaymentDto) {
        return this.svc.createPayment(mode(r), d);
    }
}