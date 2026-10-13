import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Status } from '../../../common/enums/status.enum.js';

export type InstanceDocument = HydratedDocument<Instance>;

@Schema({ timestamps: true })
export class Instance {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  imageUrl?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: Status, default: Status.Active })
  status: Status;

  // owner
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;

  
}

export const InstanceSchema = SchemaFactory.createForClass(Instance);

// same user ku same name 2 instance vendaam
InstanceSchema.index({ createdBy: 1, name: 1 }, { unique: true });
