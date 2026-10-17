import type { ApiKeyType } from '../../modules/api-keys/schemas/api-key.schema.js';

// attached to req.apiKey by ApiKeyGuard
export interface ApiKeyContext {
  keyId: string;
  subEntityId: string;
  type: ApiKeyType;
}
