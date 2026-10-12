import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Status } from '../../common/enums/status.enum.js';

export type BundleDocument = HydratedDocument<Bundle>;

export enum PricingType {
  AddOn = 'addOn',
  Bundle = 'bundle',
}

@Schema({ _id: false })
export class BundleTemplate {
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ required: true, trim: true }) shortDescription: string;
  @Prop() backgroundImage?: string;
  @Prop({ required: true }) iconFamily: string;
  @Prop({ required: true }) appIcon: string;
  @Prop() webIcon?: string;
  @Prop() cardBackgroundColor?: string;
  @Prop() iconBackground?: string;
}
export const BundleTemplateSchema = SchemaFactory.createForClass(BundleTemplate);

@Schema({ timestamps: true })
export class Bundle {
  // 1. Basic info
  @Prop({ required: true, trim: true }) name: string;
  @Prop({ required: true, unique: true, trim: true }) shortCode: string;
  @Prop({ required: true }) iconFamily: string;
  @Prop({ required: true }) appIcon: string;
  @Prop() webIcon?: string;
  @Prop() backgroundColor?: string;
  @Prop({ type: String, enum: PricingType, required: true }) pricingType: PricingType;
  @Prop({ type: String, enum: Status, default: Status.Active }) status: Status;

  // pricing (add-on only)
  @Prop() price?: number;
  @Prop() discount?: number; // percent
  @Prop() sellingPrice?: number;

  // 2. Client-facing content
  @Prop({ required: true }) longDescription: string; // HTML from the rich text editor
  @Prop({ type: [String], default: [] }) benefits: string[];
  @Prop() supportPhone?: string;
  @Prop() websiteUrl?: string;
  @Prop() promoCode?: string;
  @Prop() promoCodeUsageNote?: string;
  @Prop() disclosure?: string;
  @Prop() disclaimer?: string;
  @Prop() additionalInformation?: string;
  @Prop() insuranceInstructions?: string;

  // 3. Template
  @Prop({ type: BundleTemplateSchema, required: true })
  template: BundleTemplate;

  @Prop({ type: Types.ObjectId, ref: 'User' }) createdBy: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User' }) updatedBy: Types.ObjectId;
}

export const BundleSchema = SchemaFactory.createForClass(Bundle);