import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MarginDocument = HydratedDocument<Margin>;

export enum MarkupType {
  Flat = 'flat',
  Percent = 'percent',
}

@Schema({ timestamps: true })
export class Margin {
  @Prop({ type: Types.ObjectId, ref: 'Bundle', required: true, unique: true })
  product: Types.ObjectId;

  // inputs
  @Prop({ required: true, min: 0 }) wholesalePrice: number;
  @Prop({ required: true, min: 0 }) retailPrice: number;
  @Prop({ type: String, enum: MarkupType, required: true }) markupType: MarkupType;
  @Prop({ required: true, min: 0 }) markupValue: number;

  // calculated
  @Prop({ required: true }) markupAmount: number;   // Roja Markup ($)
  @Prop({ required: true }) markupPercent: number;  // Roja Markup (%)
  @Prop({ required: true }) buyRate: number;        // Roja Buy value
  @Prop({ required: true }) marginVsRetail: number; // Margin vs Retail

  @Prop({ type: Types.ObjectId, ref: 'User' }) createdBy: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User' }) updatedBy: Types.ObjectId;
}

export const MarginSchema = SchemaFactory.createForClass(Margin);