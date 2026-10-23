import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApiKeyType } from '../../api-keys/schemas/api-key.schema.js';

export type StripeHistoryDocument = HydratedDocument<StripeHistory>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class StripeHistory {
    // client (Entity) the environment belongs to
    @Prop({ type: Types.ObjectId, ref: 'Entity', default: null })
    entityId?: Types.ObjectId | null;

    // environment (SubEntity) that owns the API key
    @Prop({ type: Types.ObjectId, ref: 'SubEntity', required: true })
    subEntityId: Types.ObjectId;

    @Prop({ type: String, required: true })
    keyId: string;

    @Prop({ type: String, enum: ApiKeyType, required: true })
    environment: ApiKeyType;

    @Prop({ type: String, required: true })
    action: string;

    @Prop({ type: String, default: null })
    entityType?: string | null;

    @Prop({ type: String, default: null })
    stripeObjectId?: string | null;

    @Prop({ type: String, default: null })
    customerId?: string | null;

    @Prop({ type: String, enum: ['success', 'failed'], required: true })
    status: 'success' | 'failed';

    @Prop({ type: Number, default: null })
    statusCode?: number | null;

    @Prop({ type: String, default: null })
    errorMessage?: string | null;

    // cents
    @Prop({ type: Number, default: null })
    amount?: number | null;

    @Prop({ type: String, default: null })
    currency?: string | null;

    // JSON strings, secrets already removed
    @Prop({ type: String, default: null })
    requestBody?: string | null;

    @Prop({ type: String, default: null })
    responseBody?: string | null;

    createdAt?: Date;
}

export const StripeHistorySchema = SchemaFactory.createForClass(StripeHistory);

StripeHistorySchema.index({ subEntityId: 1, environment: 1, createdAt: -1 });
StripeHistorySchema.index({ entityId: 1, environment: 1, createdAt: -1 });