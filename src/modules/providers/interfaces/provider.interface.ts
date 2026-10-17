import { Types } from 'mongoose';
import { ProviderMode } from '../schemas/provider.schema.js';

export interface CredentialSetView {
  mode: ProviderMode;
  apiUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  hasClientSecret: boolean;
  hasRefreshToken: boolean;
  instanceUrl?: string;
  updatedAt?: Date;
}

export interface ProviderView {
  id: Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  logo: string;
  credentials: CredentialSetView[];
  isActive: boolean;
}

export interface ProviderCredentialSecrets {
  mode: ProviderMode;
  apiUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  instanceUrl?: string;
}

export interface DeleteResponse {
  deleted: boolean;
}