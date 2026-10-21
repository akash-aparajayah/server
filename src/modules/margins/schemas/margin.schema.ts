import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MarginDocument = HydratedDocument<Margin>;

export enum MarkupType {
  Flat = 'flat',
  Percent = 'percent',
}

@Schema({ timestamps: true })
export class Margin {
  // Product reference
  @Prop({
    type: Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true,
  })
  product: Types.ObjectId;

  // Input fields
  @Prop({ type: Number, required: true, min: 0 })
  wholesalePrice: number;

  @Prop({ type: Number, required: true, min: 0 })
  retailPrice: number;

  @Prop({
    type: String,
    enum: MarkupType,
    required: true,
  })
  markupType: MarkupType;

  @Prop({ type: Number, required: true, min: 0 })
  markupValue: number;

  // Calculated fields
  @Prop({ type: Number, required: true })
  markupAmount: number;

  @Prop({ type: Number, required: true })
  markupPercent: number;

  @Prop({ type: Number, required: true })
  buyRate: number;

  @Prop({ type: Number, required: true })
  marginVsRetail: number;

  // Audit fields
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  updatedBy: Types.ObjectId;
}

export const MarginSchema = SchemaFactory.createForClass(Margin);
