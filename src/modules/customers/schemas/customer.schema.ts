import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ timestamps: true })
export class Customer {
    @Prop({ type: String, required: true, unique: true, trim: true })
    stripeId: string;

    @Prop({ type: String, default: null }) name: string | null;
    @Prop({ type: String, default: null }) email: string | null;
    @Prop({ type: String, default: null }) phone: string | null;

    // true = live, false = sandbox (Stripe's "livemode")
    @Prop({ type: Boolean, required: true }) livemode: boolean;

    @Prop({ type: Types.ObjectId, ref: 'Entity', default: null }) entityId: Types.ObjectId | null;
    @Prop({ type: Types.ObjectId, ref: 'SubEntity', default: null }) subEntityId: Types.ObjectId | null;

    createdAt?: Date;
    updatedAt?: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ entityId: 1, createdAt: -1 });