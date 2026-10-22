import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductTemplateDocument = HydratedDocument<ProductTemplate>;

export enum TemplateStatus {
    Active = 'active',
    Inactive = 'inactive',
}

@Schema({ timestamps: true })
export class ProductTemplate {
    @Prop({ type: String, required: true, trim: true })
    name: string;

    @Prop({ type: String, enum: TemplateStatus, required: true })
    status: TemplateStatus;

    @Prop({ type: String, default: '' }) bgImage: string;
    @Prop({ type: String, default: '' }) frontImage: string;

    @Prop({ type: String, default: '' }) cardBg: string;
    @Prop({ type: String, default: '' }) buttonBg: string;
    @Prop({ type: String, default: '' }) buttonText: string;
    @Prop({ type: String, default: '' }) textPrimary: string;
    @Prop({ type: String, default: '' }) textSecondary: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    createdBy: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    updatedBy: Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}

export const ProductTemplateSchema =
    SchemaFactory.createForClass(ProductTemplate);

// "FinancialConnect" and "financialconnect" count as the same name
ProductTemplateSchema.index(
    { name: 1 },
    { unique: true, collation: { locale: 'en', strength: 2 } },
);