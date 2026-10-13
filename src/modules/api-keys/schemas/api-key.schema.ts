
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApiKeyDocument = HydratedDocument<ApiKey>;

@Schema({ timestamps: true })
export class ApiKey {
  @Prop({
    type: Types.ObjectId,
    ref: 'Instance',
    required: true,
  })
  instanceId: Types.ObjectId;

  @Prop({
    trim: true,
    maxlength: 200,
  })
  note?: string;

  // SHA-256 hash of the raw API key; never store the raw key
  @Prop({
    required: true,
    unique: true,
    select: false,
  })
  keyHash: string;

  // Display only (e.g. rk_live_ab12)
  @Prop({
    required: true,
  })
  prefix: string;

  @Prop({
    type: Date,
    default: null,
  })
  expiresAt?: Date | null;

  @Prop({
    type: Date,
    default: null,
  })
  lastUsedAt?: Date | null;

  // false = revoked
  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: Types.ObjectId;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// Only one active API key per instance
ApiKeySchema.index(
  { instanceId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isActive: true,
    },
  },
);
