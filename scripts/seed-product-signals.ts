import 'dotenv/config';

import mongoose, { Types } from 'mongoose';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  ProductSignal,
  ProductSignalSchema,
} from '../src/modules/signals/schemas/signal.schema.js';

interface LegacySignal {
  signalid: string;
  label: string;
  match?: Record<string, unknown>;
  weight: {
    type: string;
    value?: number;
    cap?: number;
    divisor?: number;
    multiplier?: number;
    reference?: number;
    trigger?: number;
    trigger_above?: number;
  };
  min_count?: number | null;
  createdBy?: string | { $oid: string };
  updatedBy?: string | { $oid: string };
  isActive?: boolean;
  isDeleted?: boolean;
  status?: string;
}

const SUPPORTED_WEIGHT_TYPES = [
  'flat',
  'saturating',
  'ratio',
  'balance',
  'percentage',
] as const;

type SupportedWeightType = (typeof SUPPORTED_WEIGHT_TYPES)[number];

function normalizeWeightType(value: string): SupportedWeightType {
  const normalized = value.trim().toLowerCase();

  const aliases: Record<string, SupportedWeightType> = {
    balance_strain: 'balance',
    ratio_of_spend: 'ratio',
  };

  const mappedType = aliases[normalized] ?? normalized;

  if (!SUPPORTED_WEIGHT_TYPES.includes(mappedType as SupportedWeightType)) {
    throw new Error(
      `Unsupported weight type "${value}". Supported values: ${SUPPORTED_WEIGHT_TYPES.join(', ')}`,
    );
  }

  return mappedType as SupportedWeightType;
}

function toObjectId(
  value: string | { $oid: string } | undefined,
  field: string,
): Types.ObjectId {
  const id = typeof value === 'string' ? value : value?.$oid;

  if (!id || !Types.ObjectId.isValid(id)) {
    throw new Error(`Missing or invalid ObjectId for ${field}`);
  }

  return new Types.ObjectId(id);
}

export async function seedProductSignals(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing from .env');
  }

  try {
    console.log('[SIGNALS] Connecting to MongoDB...');

    await mongoose.connect(mongoUri);

    console.log('[SIGNALS] MongoDB connected.');

    const signalModel = mongoose.model(ProductSignal.name, ProductSignalSchema);

    const filePath = resolve(
      process.cwd(),
      'data',
      'demo_roja.signalconfigs.json',
    );

    const fileContent = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(fileContent);

    if (!Array.isArray(parsed)) {
      throw new Error('Signal JSON must contain an array.');
    }

    const signals = parsed as LegacySignal[];

    if (signals.length === 0) {
      console.log('[SIGNALS] No signals found.');
      return;
    }

    const operations = signals.map((signal) => {
      const signalId = signal.signalid?.trim().toLowerCase();

      if (!signalId || !signal.label?.trim()) {
        throw new Error('Each signal must have a valid signalid and label.');
      }

      if (!signal.weight?.type) {
        throw new Error(`Missing weight type for "${signalId}".`);
      }

      const createdBy = toObjectId(signal.createdBy, `${signalId}.createdBy`);

      const updatedBy = signal.updatedBy
        ? toObjectId(signal.updatedBy, `${signalId}.updatedBy`)
        : createdBy;

      const weight = signal.weight;

      const update: Record<string, unknown> = {
        signalId,
        label: signal.label.trim(),
        match: signal.match ?? {},
        weightType: normalizeWeightType(weight.type),
        isActive:
          signal.isActive ??
          (signal.status ? signal.status.toLowerCase() === 'active' : true),
        isDeleted: signal.isDeleted ?? false,
        createdBy,
        updatedBy,
      };

      if (signal.min_count != null) {
        update.minCount = signal.min_count;
      }

      if (weight.value !== undefined) {
        update.weightValue = weight.value;
      }

      if (weight.cap !== undefined) {
        update.cap = weight.cap;
      }

      if (weight.divisor !== undefined) {
        update.divisor = weight.divisor;
      }

      if (weight.multiplier !== undefined) {
        update.multiplier = weight.multiplier;
      }

      if (weight.reference !== undefined) {
        update.reference = weight.reference;
      }

      const trigger = weight.trigger ?? weight.trigger_above;

      if (trigger !== undefined) {
        update.trigger = trigger;
      }

      return {
        updateOne: {
          filter: { signalId },
          update: { $set: update },
          upsert: true,
        },
      };
    });

    const result = await signalModel.bulkWrite(operations, {
      ordered: true,
    });

    console.log('[SIGNALS] Seeding completed.');
    console.log(`Input records: ${signals.length}`);
    console.log(`Inserted: ${result.upsertedCount}`);
    console.log(`Updated: ${result.modifiedCount}`);
    console.log(`Matched: ${result.matchedCount}`);
  } catch (error: unknown) {
    console.error(
      '[SIGNALS] Seeding failed:',
      error instanceof Error ? error.message : error,
    );

    throw error;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('[SIGNALS] MongoDB disconnected.');
    }
  }
}
