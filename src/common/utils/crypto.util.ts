import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function toKey(keyHex: string): Buffer {
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY must be 64 hex characters');
  }
  return key;
}

// AES-256-GCM: returns "iv.tag.cipher" (all base64)
export function encrypt(plain: string, keyHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', toKey(keyHex), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64')).join('.');
}

export function decrypt(payload: string, keyHex: string): string {
  const [iv, tag, enc] = payload
    .split('.')
    .map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', toKey(keyHex), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    'utf8',
  );
}
