// Stripe service: loads the saved secret key for the mode, calls Stripe, and turns Stripe errors into clear HTTP errors.
import { HttpException, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { SettingsService } from '../settings/settings.service.js';
import {
    AccountIdDto,
    AccountLinkDto,
    AttachCardDto,
    DetachCardDto,
    ExternalAccountDto,
    PaymentDto,
    PayoutDto,
    SetupIntentDto,
    StripeDataDto,
    StripeUpdateDto,
    SubscriptionDto,
    TransferDto,
    VerifySetupDto,
} from './dto/stripe.dto.js';

export type Mode = 'sandbox' | 'live';

// Turns an optional idempotency key into Stripe's request option (a retry with the same key never repeats the action).
const idem = (k?: string) => (k ? { idempotencyKey: k } : undefined);

@Injectable()
export class StripeService {
    constructor(private readonly settings: SettingsService) { }

    // Builds a Stripe client for the key's mode (secret comes from Settings, decrypted here only).
    private async client(mode: Mode): Promise<Stripe> {
        const secret = await this.settings.getGatewaySecret(mode);
        const wanted = mode === 'live' ? '_live_' : '_test_';
        if (!secret.includes(wanted)) {
            throw new HttpException(
                { message: `The saved ${mode} Stripe key is not a ${mode} key` },
                400,
            );
        }
        return new Stripe(secret);
    }

    // Runs one Stripe call and converts Stripe errors into clean HTTP errors (a rejected key is hidden as 502).
    private async run(
        mode: Mode,
        fn: (s: Stripe) => Promise<unknown>,
    ): Promise<unknown> {
        const stripe = await this.client(mode);
        try {
            return await fn(stripe);
        } catch (e) {
            if (e instanceof Stripe.errors.StripeError) {
                const status = e.statusCode ?? 400;
                if (status === 401) {
                    // the saved Stripe key was rejected: don't confuse it with the caller's API key
                    throw new HttpException(
                        { message: 'Payment gateway credentials were rejected' },
                        502,
                    );
                }
                throw new HttpException(
                    { message: e.message, code: e.code, type: e.type },
                    status >= 500 ? 502 : status,
                );
            }
            throw e;
        }
    }

    // ---------- customers / catalog ----------

    // Creates a Stripe customer from the fields in "data".
    createCustomer(m: Mode, d: StripeDataDto) {
        return this.run(m, (s) =>
            s.customers.create(d.data as Stripe.CustomerCreateParams, idem(d.idempotencyKey)),
        );
    }

    // Updates the customer with id "d.id" using the fields in "data".
    updateCustomer(m: Mode, d: StripeUpdateDto) {
        return this.run(m, (s) =>
            s.customers.update(d.id, d.data as Stripe.CustomerUpdateParams),
        );
    }

    // Creates a Stripe product from the fields in "data".
    createProduct(m: Mode, d: StripeDataDto) {
        return this.run(m, (s) =>
            s.products.create(d.data as Stripe.ProductCreateParams, idem(d.idempotencyKey)),
        );
    }

    // Updates the product with id "d.id" using the fields in "data".
    updateProduct(m: Mode, d: StripeUpdateDto) {
        return this.run(m, (s) =>
            s.products.update(d.id, d.data as Stripe.ProductUpdateParams),
        );
    }

    // Creates a plan (Stripe's older API, prefer prices for new work).
    createPlan(m: Mode, d: StripeDataDto) {
        return this.run(m, (s) =>
            s.plans.create(d.data as Stripe.PlanCreateParams, idem(d.idempotencyKey)),
        );
    }

    // Updates the plan with id "d.id" using the fields in "data".
    updatePlan(m: Mode, d: StripeUpdateDto) {
        return this.run(m, (s) =>
            s.plans.update(d.id, d.data as Stripe.PlanUpdateParams),
        );
    }

    // Creates a price (one-time or recurring) for a product.
    createPrice(m: Mode, d: StripeDataDto) {
        return this.run(m, (s) =>
            s.prices.create(d.data as Stripe.PriceCreateParams, idem(d.idempotencyKey)),
        );
    }

    // Updates the price with id "d.id" using the fields in "data".
    updatePrice(m: Mode, d: StripeUpdateDto) {
        return this.run(m, (s) =>
            s.prices.update(d.id, d.data as Stripe.PriceUpdateParams),
        );
    }

    // ---------- cards / bank ----------

    // Attaches a payment method (card) to a customer.
    attachCard(m: Mode, d: AttachCardDto) {
        return this.run(m, (s) =>
            s.paymentMethods.attach(d.paymentMethodId, { customer: d.customerId }),
        );
    }

    // Detaches a payment method from its customer.
    detachCard(m: Mode, d: DetachCardDto) {
        return this.run(m, (s) => s.paymentMethods.detach(d.paymentMethodId));
    }

    // Creates a setup intent so the customer can save a card or bank account (defaults to card + us_bank_account).
    createSetupIntent(m: Mode, d: SetupIntentDto) {
        const params: Stripe.SetupIntentCreateParams = {
            customer: d.customerId,
            automatic_payment_methods: { enabled: true },
        };
        return this.run(m, (s) => s.setupIntents.create(params));
    }

    // Verifies a bank account with the two micro-deposit amounts.
    verifySetupIntent(m: Mode, d: VerifySetupDto) {
        return this.run(m, (s) =>
            s.setupIntents.verifyMicrodeposits(d.setupIntentId, { amounts: d.amounts }),
        );
    }

    // ---------- connected accounts ----------

    // Creates a connected account (needs Stripe Connect enabled).
    createAccount(m: Mode, d: StripeDataDto) {
        return this.run(m, (s) =>
            s.v2.core.accounts.create(d.data as never, idem(d.idempotencyKey)),
        );
    }

    // Fetches a connected account by id.
    retrieveAccount(m: Mode, d: AccountIdDto) {
        return this.run(m, (s) => s.accounts.retrieve(d.accountId));
    }

    // Adds a bank account or card to a connected account.
    createExternalAccount(m: Mode, d: ExternalAccountDto) {
        return this.run(m, (s) =>
            s.accounts.createExternalAccount(d.accountId, d.data as never),
        );
    }

    // Creates an onboarding link for a connected account.
    createAccountLink(m: Mode, d: AccountLinkDto) {
        return this.run(m, (s) =>
            s.accountLinks.create({
                account: d.accountId,
                refresh_url: d.refreshUrl,
                return_url: d.returnUrl,
                type: 'account_onboarding',
            }),
        );
    }

    // ---------- money movement ----------

    // Moves money from your balance to a connected account (amount in cents, default currency usd).
    createTransfer(m: Mode, d: TransferDto) {
        return this.run(m, (s) =>
            s.transfers.create(
                {
                    amount: d.amount,
                    currency: d.currency ?? 'usd',
                    destination: d.destination,
                    metadata: d.metadata,
                },
                idem(d.idempotencyKey),
            ),
        );
    }

    // Pays out a connected account's balance to its bank (advanceId is saved in the payout metadata).
    createPayout(m: Mode, d: PayoutDto) {
        return this.run(m, (s) =>
            s.payouts.create(
                {
                    amount: d.amount,
                    currency: d.currency ?? 'usd',
                    metadata: d.advanceId ? { advanceId: d.advanceId } : undefined,
                },
                { stripeAccount: d.accountId, ...idem(d.idempotencyKey) },
            ),
        );
    }

    // Starts a subscription; the customer needs a default payment method first.
    createSubscription(m: Mode, d: SubscriptionDto) {
        return this.run(m, (s) =>
            s.subscriptions.create(
                {
                    customer: d.customerId,
                    items: [{ price: d.priceId }],
                    collection_method: 'charge_automatically',
                    payment_settings: { save_default_payment_method: 'on_subscription' },
                },
                idem(d.idempotencyKey),
            ),
        );
    }

    // Charges a saved card once, without the customer present (amount in cents, default currency usd).
    createPayment(m: Mode, d: PaymentDto) {
        return this.run(m, (s) =>
            s.paymentIntents.create(
                {
                    amount: d.amount,
                    currency: d.currency ?? 'usd',
                    customer: d.customerId,
                    payment_method: d.paymentMethodId,
                    confirm: true,
                    off_session: true,
                },
                idem(d.idempotencyKey),
            ),
        );
    }
}