export const UPLOAD_FOLDERS = [
  'products',
  'bundles',
  'entities',
  'terms',
  'users',
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_DOC_BYTES = 5 * 1024 * 1024;

export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const DOC_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
};

export const FOLDER_RULES: Record<
  UploadFolder,
  { types: Record<string, string>; maxBytes: number }
> = {
  products: { types: IMAGE_TYPES, maxBytes: MAX_IMAGE_BYTES },
  bundles: { types: IMAGE_TYPES, maxBytes: MAX_IMAGE_BYTES },
  entities: { types: IMAGE_TYPES, maxBytes: MAX_IMAGE_BYTES },
  terms: { types: DOC_TYPES, maxBytes: MAX_DOC_BYTES },
  users: { types: IMAGE_TYPES, maxBytes: MAX_IMAGE_BYTES },
};
