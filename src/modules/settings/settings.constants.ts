export const THEMES = ['light', 'dark', 'system'] as const;
export const LANGUAGES = ['en', 'ta', 'hi'] as const;
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] as const;
export const TIME_ZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'America/New_York',
  'Europe/London',
  'UTC',
] as const;

export const DEFAULT_PREFERENCES = {
  theme: 'light',
  language: 'en',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  timeZone: 'Asia/Kolkata',
};

export interface ColumnDef {
  key: string;
  label: string;
  locked?: boolean; // always shown, cannot be hidden
  defaultVisible: boolean;
}

export const COLUMN_REGISTRY: Record<string, ColumnDef[]> = {
  products: [
    { key: 'name', label: 'Name', locked: true, defaultVisible: true },
    { key: 'sku', label: 'SKU', defaultVisible: false },
    { key: 'category', label: 'Category', defaultVisible: false },
    { key: 'features', label: 'Features', defaultVisible: true },
    { key: 'retailPrice', label: 'Retail Price', defaultVisible: true },
    { key: 'sellingPrice', label: 'Selling Price', defaultVisible: true },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'createdBy', label: 'Created By', defaultVisible: false },
  ],
  categories: [
    { key: 'name', label: 'Name', locked: true, defaultVisible: true },
    { key: 'slug', label: 'Slug', defaultVisible: true },
    { key: 'description', label: 'Description', defaultVisible: false },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'createdAt', label: 'Created On', defaultVisible: true },
  ],
  bundles: [
    { key: 'name', label: 'Name', locked: true, defaultVisible: true },
    { key: 'shortCode', label: 'Short Code', defaultVisible: true },
    { key: 'pricingType', label: 'Pricing Type', defaultVisible: true },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'createdAt', label: 'Created On', defaultVisible: true },
  ],
  clients: [
    { key: 'name', label: 'Name', locked: true, defaultVisible: true },
    { key: 'description', label: 'Description', defaultVisible: true },
    { key: 'status', label: 'Status', defaultVisible: true },
    { key: 'createdBy', label: 'Created By', defaultVisible: false },
    { key: 'createdAt', label: 'Created On', defaultVisible: true },
    { key: 'updatedAt', label: 'Updated On', defaultVisible: false },
  ],
  'engine-configurations': [
    { key: 'name', label: 'Name', locked: true, defaultVisible: true },
    { key: 'providerId', label: 'Provider ID', defaultVisible: true },
    { key: 'offerType', label: 'Offer Type', defaultVisible: true },
    { key: 'createdAt', label: 'Created On', defaultVisible: true },
    { key: 'updatedAt', label: 'Last Updated On', defaultVisible: true },
    { key: 'status', label: 'Status', defaultVisible: true },
  ],
};

export const TABLE_KEYS = Object.keys(COLUMN_REGISTRY);
export const GATEWAY_MODES = ['sandbox', 'live'] as const;
