import { HttpException } from '@nestjs/common';

const ENTITY_TYPE: Record<string, string> = {
    'create-customer': 'customer',
    'update-customer': 'customer',
    'create-product': 'product',
    'update-product': 'product',
    'create-plan': 'plan',
    'update-plan': 'plan',
    'create-price': 'price',
    'update-price': 'price',
    'attach-card': 'card',
    'detach-card': 'card',
    'create-setup-intent': 'setup_intent',
    'verify-setup-intent': 'setup_intent',
    'create-account': 'account',
    'retrieve-account': 'account',
    'create-account-link': 'account',
    'create-external-account': 'account',
    'create-transfer': 'transfer',
    'create-payout': 'payout',
    'create-subscription': 'subscription',
    'create-payment': 'payment',
};

const MONEY_TYPES = ['payment', 'transfer', 'payout'];

// keys whose values are never saved
const SECRET_KEYS = new Set([
    'client_secret',
    'number',
    'cvc',
    'account_number',
    'routing_number',
    'ssn_last_4',
    'id_number',
    'password',
    'secret',
    'api_key',
]);

export function toPlain(value: unknown): unknown {
    try {
        return JSON.parse(JSON.stringify(value ?? null));
    } catch {
        return null;
    }
}

export function redact(value: unknown, depth = 0): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (depth > 12) return '[TRUNCATED]';
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] =
            SECRET_KEYS.has(k.toLowerCase()) && v != null
                ? '[REDACTED]'
                : redact(v, depth + 1);
    }
    return out;
}

export const toStored = (value: unknown): string =>
    JSON.stringify(redact(toPlain(value)));

export function parseStored(value?: string | null): unknown {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

// action = last part of the URL, for example "create-payment"
export function describeCall(action: string, body: unknown, res: unknown) {
    const r = (res && typeof res === 'object' ? res : {}) as Record<string, any>;
    const b = (body && typeof body === 'object' ? body : {}) as Record<string, any>;
    const str = (v: unknown) => (typeof v === 'string' ? v : null);
    const num = (v: unknown) => (typeof v === 'number' ? v : null);
    const entityType = ENTITY_TYPE[action] ?? null;
    const money = !!entityType && MONEY_TYPES.includes(entityType);
    return {
        entityType,
        stripeObjectId: str(r.id),
        customerId:
            str(r.customer) ??
            str(b.customerId) ??
            (r.object === 'customer' ? str(r.id) : null),
        amount: money ? (num(r.amount) ?? num(b.amount)) : null,
        currency: money ? (str(r.currency) ?? str(b.currency)) : null,
    };
}

export function failureMessage(err: unknown): string {
    if (err instanceof HttpException) {
        const r = err.getResponse() as any;
        const m = typeof r === 'string' ? r : r?.message;
        return Array.isArray(m) ? m.join(', ') : String(m ?? err.message);
    }
    return err instanceof Error ? err.message : 'Unknown error';
}