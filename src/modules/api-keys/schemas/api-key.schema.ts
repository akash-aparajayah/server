import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApiKeyDocument = HydratedDocument<ApiKey>;

@Schema({ timestamps: true })
export class ApiKey {
  @Prop({ type: Types.ObjectId, ref: 'Entity', required: true })
  entityId: Types.ObjectId;

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
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// one live key per entity
ApiKeySchema.index(
  { entityId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
