import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GatewayCredentialDocument = HydratedDocument<GatewayCredential>;

@Schema({ timestamps: true })
export class GatewayCredential {
  @Prop({
    type: String,
    required: true,
    unique: true,
    enum: ['sandbox', 'live'],
  })
  mode: string;

  @Prop({ type: String, required: true, trim: true })
  publishableKey: string;

  // AES-256-GCM encrypted. Never returned to the client.
  @Prop({ type: String, required: true, select: false })
  secretKeyEnc: string;

  // only for the masked display (sk_••••1234)
  @Prop({ type: String, required: true })
  secretLast4: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const GatewayCredentialSchema =
  SchemaFactory.createForClass(GatewayCredential);
