import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum DocMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    PATCH = 'PATCH',
    DELETE = 'DELETE',
}

@Schema({ _id: false })
export class DocHeader {
    @Prop({ type: String, trim: true, required: true }) field: string;
    @Prop({ type: String, trim: true, default: 'String' }) type: string;
    @Prop({ type: String, trim: true, default: '' }) details: string;
}
export const DocHeaderSchema = SchemaFactory.createForClass(DocHeader);

@Schema({ _id: false })
export class DocBodyField {
    @Prop({ type: String, trim: true, required: true }) field: string;
    @Prop({ type: String, trim: true, default: 'String' }) type: string;
    @Prop({ type: Boolean, default: false }) required: boolean;
    @Prop({ type: String, trim: true, default: '' }) details: string;
}
export const DocBodyFieldSchema = SchemaFactory.createForClass(DocBodyField);

@Schema({ _id: false })
export class DocResponse {
    @Prop({ type: String, trim: true, required: true }) code: string;
    @Prop({ type: String, trim: true, default: '' }) subject: string;
    @Prop({ type: String, trim: true, default: '' }) details: string;
}
export const DocResponseSchema = SchemaFactory.createForClass(DocResponse);

@Schema({ timestamps: true })
export class ApiDoc {
    @Prop({ type: String, required: true, trim: true }) name: string;
    @Prop({ type: String, enum: DocMethod, default: DocMethod.POST }) method: DocMethod;
    @Prop({ type: String, required: true, trim: true }) url: string;
    @Prop({ type: String, trim: true, default: '' }) description: string;
    @Prop({ type: String, trim: true, default: '' }) service: string;
    @Prop({ type: Types.ObjectId, ref: 'Provider', default: null }) providerId: Types.ObjectId | null;
    @Prop({ type: [DocHeaderSchema], default: [] }) headers: DocHeader[];
    @Prop({ type: [DocBodyFieldSchema], default: [] }) body: DocBodyField[];
    @Prop({ type: [DocResponseSchema], default: [] }) responses: DocResponse[];
    @Prop({ type: String, default: '' }) requestExample: string;
    @Prop({ type: String, default: '' }) responseExample: string;
    @Prop({ type: Boolean, default: true }) isActive: boolean;
    @Prop({ type: Types.ObjectId, ref: 'User', required: true }) createdBy: Types.ObjectId;
    @Prop({ type: Types.ObjectId, ref: 'User', required: true }) updatedBy: Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}

export type ApiDocDocument = HydratedDocument<ApiDoc>;
export const ApiDocSchema = SchemaFactory.createForClass(ApiDoc);