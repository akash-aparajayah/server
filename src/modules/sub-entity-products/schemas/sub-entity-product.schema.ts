import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { MarkupType } from '../../margins/schemas/margin.schema.js';

export type SubEntityProductDocument = HydratedDocument<SubEntityProduct>;

@Schema({ _id: false })
export class SubEntityMargin {
  @Prop({ required: true, min: 0.01 }) wholesalePrice: number;
  @Prop({ type: String, enum: MarkupType, required: true })
  markupType: MarkupType;
  @Prop({ required: true, min: 0 }) markupValue: number;

  // calculated by the server
  @Prop({ required: true }) markupAmount: number;
  @Prop({ required: true }) markupPercent: number;
  @Prop({ required: true }) buyRate: number;
}
export const SubEntityMarginSchema =
  SchemaFactory.createForClass(SubEntityMargin);

@Schema({ timestamps: true })
export class SubEntityProduct {
  @Prop({ type: Types.ObjectId, ref: 'SubEntity', required: true })
  subEntity: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  product: Types.ObjectId;

  @Prop({ type: SubEntityMarginSchema, required: false })
  margin?: SubEntityMargin;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const SubEntityProductSchema =
  SchemaFactory.createForClass(SubEntityProduct);

// one product only once per sub entity
SubEntityProductSchema.index({ subEntity: 1, product: 1 }, { unique: true });
