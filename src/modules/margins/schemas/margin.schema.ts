import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MarginDocument = HydratedDocument<Margin>;

export enum MarkupType {
  Flat = 'flat',
  Percent = 'percent',
}

@Schema({ timestamps: true })
export class Margin {
  // Product module vandha aprom populate pannalam
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, unique: true })
  product: Types.ObjectId;

  // inputs
  @Prop({ required: true, min: 0 }) wholesalePrice: number;
  @Prop({ required: true, min: 0 }) retailPrice: number;
  @Prop({ type: String, enum: MarkupType, required: true })
  markupType: MarkupType;
  @Prop({ required: true, min: 0 }) markupValue: number;

  // calculated (service la set aagum, client anuppa koodathu)
  @Prop({ required: true }) markupAmount: number; // Roja Markup ($)
  @Prop({ required: true }) markupPercent: number; // Roja Markup (%)
  @Prop({ required: true }) buyRate: number; // Roja Buy value
  @Prop({ required: true }) marginVsRetail: number; // negative aagalam

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const MarginSchema = SchemaFactory.createForClass(Margin);
