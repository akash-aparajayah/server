import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApiKeyDocument = HydratedDocument<ApiKey>;

export enum ApiKeyMode {
  Test = 'test',
  Live = 'live',
}

@Schema({ timestamps: true })
export class ApiKey {
  @Prop({ required: true, trim: true, index: true })
  projectId: string;

  @Prop({ required: true, trim: true })
  environmentId: string;

  @Prop({ trim: true })
  note?: string;

  @Prop({ type: String, enum: ApiKeyMode, required: true })
  mode: ApiKeyMode;

  // sha256 hash of the raw key; the raw key is never stored
  @Prop({ required: true, unique: true, select: false })
  keyHash: string;

  @Prop({ required: true })
  prefix: string;

  @Prop({ type: Number, default: null })
  expiresInDays?: number | null;

  @Prop({ type: Date, default: null })
  expiresAt?: Date | null;

  @Prop({ type: Date, default: null })
  lastUsedAt?: Date | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

// only one live key per project + environment + mode
ApiKeySchema.index(
  { projectId: 1, environmentId: 1, mode: 1 },
  { unique: true, partialFilterExpression: { isActive: true, isDeleted: false } },
);