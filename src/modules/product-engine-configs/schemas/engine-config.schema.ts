import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EngineConfigDocument = HydratedDocument<EngineConfig>;

export enum WeightType {
  Flat = 'flat',
  Saturating = 'saturating',
  Ratio = 'ratio',
  Balance = 'balance',
  Percentage = 'percentage', // legacy, only for old data
}

@Schema({ _id: false })
export class SignalMatch {
  @Prop({ type: [String], default: [] }) topCategory: string[];
  @Prop({ type: [String], default: [] }) code: string[];
  @Prop({ type: [String], default: [] }) mcc: string[];
  @Prop({ type: [String], default: [] }) keywords: string[];
  @Prop({ type: [String], default: [] }) flags: string[];
  @Prop({ type: String, trim: true }) sameAs?: string;
  @Prop({ type: String, trim: true }) contextField?: string;
}
export const SignalMatchSchema = SchemaFactory.createForClass(SignalMatch);

@Schema({ _id: false })
export class Signal {
  @Prop({ type: String, required: true, trim: true }) signalId: string;
  @Prop({ type: String, trim: true }) label?: string;
  @Prop({ type: Number, min: 0 }) minCount?: number;
  @Prop({ type: SignalMatchSchema, default: () => ({}) }) match: SignalMatch;

  @Prop({ type: String, enum: WeightType, required: true })
  weightType: WeightType;
  @Prop({ type: Number }) weightValue?: number;
  @Prop({ type: Number }) cap?: number;
  @Prop({ type: Number }) divisor?: number;
  @Prop({ type: Number }) multiplier?: number;
  @Prop({ type: Number }) reference?: number;
  @Prop({ type: Number }) trigger?: number;
}
export const SignalSchema = SchemaFactory.createForClass(Signal);

@Schema({ _id: false })
export class Thresholds {
  @Prop({ type: Number, required: true }) show: number;
  @Prop({ type: Number, required: true }) review: number;
  @Prop({ type: Number, default: 0 }) hide: number;
}
export const ThresholdsSchema = SchemaFactory.createForClass(Thresholds);

@Schema({ timestamps: true })
export class EngineConfig {
  @Prop({ type: String, required: true, trim: true, index: true })
  providerId: string; // e.g. PROV_ID0000001

  @Prop({ type: String, required: true, trim: true, index: true })
  offerType: string; // e.g. Quick Loans

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true })
  category?: string;

  @Prop({ type: Number, default: 0 })
  baseScore: number;

  @Prop({ type: ThresholdsSchema, required: true })
  thresholds: Thresholds;

  @Prop({ type: [SignalSchema], default: [] })
  signals: Signal[];

  @Prop({ type: Boolean, default: true, index: true })
  status: Boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const EngineConfigSchema = SchemaFactory.createForClass(EngineConfig);

// same provider la same config name vendaam
EngineConfigSchema.index({ providerId: 1, name: 1 }, { unique: true });
