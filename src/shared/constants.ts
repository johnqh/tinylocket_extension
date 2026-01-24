export const PRODUCT_NAME = import.meta.env.VITE_PRODUCT_NAME || 'TinyLocket';

export const AUTO_LOCK_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 0, label: 'Never' },
] as const;

export const DEFAULT_AUTO_LOCK_MINUTES = 30;

export const PBKDF2_ITERATIONS = 310000; // OWASP 2023 recommendation
export const SALT_LENGTH = 16;
export const KEY_LENGTH = 32; // 256 bits for AES-256
