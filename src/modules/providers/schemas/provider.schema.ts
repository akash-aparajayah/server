import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum ProviderMode {
  LIVE = 'live',
  SANDBOX = 'sandbox',
}

@Schema({ _id: false })
export class CredentialSet {
  @Prop({
    type: String,
    enum: ProviderMode,
    required: true,
  })
  mode: ProviderMode;

  @Prop({ type: String, trim: true })
  apiUrl?: string;

  @Prop({ type: String, trim: true })
  tokenUrl?: string;

  @Prop({ type: String, trim: true })
  clientId?: string;

  @Prop({ type: String, select: false })
  clientSecret?: string;

  @Prop({ type: String, select: false })
  refreshToken?: string;

  @Prop({ type: String, trim: true })
  instanceUrl?: string;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const CredentialSetSchema = SchemaFactory.createForClass(CredentialSet);

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: any) => {
      // cast ret to any to avoid TS errors when properties are not present on the inferred type
      delete ret.credentials;
      return ret;
    },
  },
})
export class Provider {
  @Prop({
    required: true,
    unique: true,
    trim: true,
  })
  name: string;

  @Prop({ type: String, trim: true })
  phone?: string;

  @Prop({
    type: String,
    trim: true,
    lowercase: true,
  })
  email?: string;

  @Prop({ type: String, required: true })
  logo: string;

  @Prop({
    type: [CredentialSetSchema],
    default: [],
    select: false,
  })
  credentials: CredentialSet[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export type ProviderDocument = HydratedDocument<Provider>;

export const ProviderSchema = SchemaFactory.createForClass(Provider);
