import { Types } from 'mongoose';
import { ProviderMode } from '../schemas/provider.schema.js';

export interface CredentialSetView {
  mode: ProviderMode;
  apiUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  hasClientSecret?: boolean; // only on create/update responses
  hasRefreshToken?: boolean; // only on create/update responses
  instanceUrl?: string;
  updatedAt?: Date;
}

// Returns the real secret values. Use ONLY for the protected credentials endpoint.
export interface CredentialSetDetailView {
  mode: ProviderMode;
  apiUrl?: string;
  tokenUrl?: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  instanceUrl?: string;
  updatedAt?: Date;
}

export interface AuditUserView {
  id: string;
  name?: string;
  email?: string;
}

export interface ProviderView {
  id: Types.ObjectId;
  providerId: string;
  name: string;
  phone?: string;
  email?: string;
  logo?: string;
  credentials?: CredentialSetView[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: AuditUserView;
  updatedBy?: AuditUserView;
}

export interface ProviderListView {
  id: string;
  providerId: string;
  name: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: AuditUserView;
  updatedBy?: AuditUserView;
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
