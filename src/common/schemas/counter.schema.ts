import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Counter {
  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop({ type: Number, required: true, default: 1000 })
  sequence: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
