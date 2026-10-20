import type { Types } from 'mongoose';
import type { ApiKeyType } from '../schemas/api-key.schema.js';

// Returned only when creating or regenerating a key.
export interface ApiKeyCreateResponse {
  id: Types.ObjectId;
  subEntityId: Types.ObjectId;
  type: ApiKeyType;
  note?: string;
  prefix: string;
  expiresAt?: Date | null;
  key: string;
}

// Returned when listing keys. Never expose the raw key.
export interface ApiKeyListResponse {
  id: Types.ObjectId;
  subEntityId: Types.ObjectId;
  type: ApiKeyType;
  note?: string;
  prefix: string;
  expiresAt?: Date | null;
  lastUsedAt?: Date | null;
  isActive: boolean;
}

export interface ApiKeyRevokeResponse {
  revoked: boolean;
}
