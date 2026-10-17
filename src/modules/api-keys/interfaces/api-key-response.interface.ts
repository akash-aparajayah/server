import type { Types } from 'mongoose';
import type { ApiKeyType } from '../schemas/api-key.schema.js';

// returned only on create / regenerate (raw key shown once)
export interface ApiKeyCreateResponse {
  id: Types.ObjectId;
  subEntityId: Types.ObjectId;
  type: ApiKeyType;
  note?: string;
  prefix: string;
  expiresAt?: Date | null;
  key: string;
}

export interface ApiKeyRevokeResponse {
  revoked: boolean;
}