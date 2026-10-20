import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApiKeyDocument = HydratedDocument<ApiKey>;

export enum ApiKeyType {
  LIVE = 'live',
  SANDBOX = 'sandbox',
}

@Schema({ timestamps: true })
export class ApiKey {
  // use the exact model name registered for sub entities
  @Prop({ type: Types.ObjectId, ref: 'SubEntity', required: true })
  subEntityId: Types.ObjectId;

  @Prop({ type: String, enum: ApiKeyType, required: true })
  type: ApiKeyType;

  @Prop({ trim: true, maxlength: 200 })
  note?: string;

  // sha256 hash of the raw key; the raw key is never stored
  @Prop({ required: true, unique: true, select: false })
  keyHash: string;

  @Prop({ required: true })
  prefix: string;

  @Prop({ type: Date, default: null })
  expiresAt?: Date | null;

  @Prop({ type: Date, default: null })
  lastUsedAt?: Date | null;

  // false = revoked
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  regeneratedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  regeneratedAt?: Date | null;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// Allow historical/revoked keys, but only one active key
// per sub-entity and type (live / sandbox).
ApiKeySchema.index(
  { subEntityId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
    name: 'uniq_active_api_key_per_subentity_type',
  },
);
