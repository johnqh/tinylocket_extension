import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/hashes/utils';
import { PBKDF2_ITERATIONS, SALT_LENGTH, KEY_LENGTH } from '../constants';

/**
 * Cryptographic service for encryption/decryption operations.
 * Uses PBKDF2-SHA256 for key derivation and AES-256-GCM for encryption.
 */
export class CryptoService {
  /**
   * Derive an encryption key from a password using PBKDF2-SHA256.
   */
  async deriveKey(
    password: string,
    salt?: Uint8Array
  ): Promise<{ key: Uint8Array; salt: Uint8Array }> {
    const saltBytes = salt ?? randomBytes(SALT_LENGTH);
    const key = pbkdf2(sha256, password, saltBytes, {
      c: PBKDF2_ITERATIONS,
      dkLen: KEY_LENGTH,
    });
    return { key, salt: saltBytes };
  }

  /**
   * Encrypt data using AES-256-GCM.
   */
  async encrypt(
    data: string,
    key: Uint8Array
  ): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
    const iv = randomBytes(12); // 96 bits for GCM
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(data);

    const cipher = gcm(key, iv);
    const ciphertext = cipher.encrypt(plaintext);

    return { ciphertext, iv };
  }

  /**
   * Decrypt data using AES-256-GCM.
   */
  async decrypt(
    ciphertext: Uint8Array,
    key: Uint8Array,
    iv: Uint8Array
  ): Promise<string> {
    const cipher = gcm(key, iv);
    const plaintext = cipher.decrypt(ciphertext);
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  }

  /**
   * Convert Uint8Array to base64 string.
   */
  toBase64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data));
  }

  /**
   * Convert base64 string to Uint8Array.
   */
  fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Securely zero out a Uint8Array.
   */
  zeroMemory(data: Uint8Array): void {
    data.fill(0);
  }
}

export const cryptoService = new CryptoService();
