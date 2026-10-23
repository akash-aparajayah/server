// Request body rules for the Stripe endpoints (validation, amount limit, optional idempotency key).
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    Max,
    MaxLength,
    Min,
} from 'class-validator';

// Largest single amount accepted, in the smallest unit (cents). 1,000,000 = $10,000. Change here.
export const MAX_AMOUNT = 1_000_000;

// Three-letter lowercase currency code, e.g. "usd".
const CURRENCY = /^[a-z]{3}$/;

// Shared base: adds the optional idempotency key to a request body.
class WithKey {
    // optional: the same key sent twice never charges twice
    @IsOptional() @IsString() @MaxLength(255) idempotencyKey?: string;
}

// Body for create customer / product / plan / price / account: Stripe's own fields go inside "data".
export class StripeDataDto extends WithKey {
    @IsObject() data: Record<string, any>;
}

// Body for update customer / product / plan / price: the object id plus the fields to change.
export class StripeUpdateDto {
    @IsString() @IsNotEmpty() id: string;
    @IsObject() data: Record<string, any>;
}

// Body for attach-card: which card goes to which customer.
export class AttachCardDto {
    @IsString() @IsNotEmpty() paymentMethodId: string;
    @IsString() @IsNotEmpty() customerId: string;
}

// Body for detach-card: the card to remove from its customer.
export class DetachCardDto {
    @IsString() @IsNotEmpty() paymentMethodId: string;
}

// Body for create-setup-intent: the customer and (optionally) which payment types to allow.
export class SetupIntentDto {
    @IsString() @IsNotEmpty() customerId: string;
    @IsOptional() @IsArray() @ArrayMaxSize(5) @IsString({ each: true })
    paymentMethodTypes?: string[];
}

// Body for verify-setup-intent: the setup intent and its two micro-deposit amounts.
export class VerifySetupDto {
    @IsString() @IsNotEmpty() setupIntentId: string;
    @IsArray() @ArrayMinSize(2) @ArrayMaxSize(2) @IsInt({ each: true })
    amounts: number[];
}

// Body for retrieve-account: the connected account id.
export class AccountIdDto {
    @IsString() @IsNotEmpty() accountId: string;
}

// Body for create-external-account: the connected account id plus the bank or card details in "data".
export class ExternalAccountDto {
    @IsString() @IsNotEmpty() accountId: string;
    @IsObject() data: Record<string, any>;
}

// Body for create-account-link: the connected account and where to send the user back to.
export class AccountLinkDto {
    @IsString() @IsNotEmpty() accountId: string;
    @IsUrl({ require_tld: false }) refreshUrl: string;
    @IsUrl({ require_tld: false }) returnUrl: string;
}

// Body for create-transfer: amount in cents (capped), destination account, optional currency and metadata.
export class TransferDto extends WithKey {
    @IsInt() @Min(1) @Max(MAX_AMOUNT) amount: number;
    @IsOptional() @Matches(CURRENCY) currency?: string;
    @IsString() @IsNotEmpty() destination: string;
    @IsOptional() @IsObject() metadata?: Record<string, string>;
}

// Body for create-payout: amount in cents (capped), connected account, optional advance id for tracking.
export class PayoutDto extends WithKey {
    @IsInt() @Min(1) @Max(MAX_AMOUNT) amount: number;
    @IsOptional() @Matches(CURRENCY) currency?: string;
    @IsString() @IsNotEmpty() accountId: string;
    @IsOptional() @IsString() @MaxLength(100) advanceId?: string;
}

// Body for create-subscription: which customer subscribes to which price.
export class SubscriptionDto extends WithKey {
    @IsString() @IsNotEmpty() customerId: string;
    @IsString() @IsNotEmpty() priceId: string;
}

// Body for create-payment: amount in cents (capped), the customer and the saved card to charge.
export class PaymentDto extends WithKey {
    @IsInt() @Min(1) @Max(MAX_AMOUNT) amount: number;
    @IsOptional() @Matches(CURRENCY) currency?: string;
    @IsString() @IsNotEmpty() customerId: string;
    @IsString() @IsNotEmpty() paymentMethodId: string;
}