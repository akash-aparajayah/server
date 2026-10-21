import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import {
  SignalMatch,
  SignalMatchSchema,
  WeightType,
} from '../../product-engine-configs/schemas/engine-config.schema.js';

export type ProductSignalDocument = HydratedDocument<ProductSignal>;

@Schema({ timestamps: true })
export class ProductSignal {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  })
  signalId: string;

  @Prop({ type: String, required: true, trim: true })
  label: string;

  @Prop({ type: Number, min: 0 })
  minCount?: number;

  @Prop({ type: SignalMatchSchema, default: () => ({}) })
  match: SignalMatch;

  @Prop({ type: String, enum: WeightType, required: true })
  weightType: WeightType;

  @Prop({ type: Number }) weightValue?: number;
  @Prop({ type: Number }) cap?: number;
  @Prop({ type: Number }) divisor?: number;
  @Prop({ type: Number }) multiplier?: number;
  @Prop({ type: Number }) reference?: number;
  @Prop({ type: Number }) trigger?: number;

  @Prop({ type: Boolean, default: true, index: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const ProductSignalSchema = SchemaFactory.createForClass(ProductSignal);
