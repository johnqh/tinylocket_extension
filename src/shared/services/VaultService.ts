import { v4 as uuidv4 } from 'uuid';
import { cryptoService } from './CryptoService';
import { storageService } from './StorageService';
import type { ApiKeyEntry, VaultData } from '../types/storage';
import type { LlmProvider } from '../types/providers';

/**
 * Service for managing the encrypted vault containing API keys.
 */
export class VaultService {
  private decryptedKeys: ApiKeyEntry[] | null = null;
  private encryptionKey: Uint8Array | null = null;

  /**
   * Check if vault exists (user has set up the extension).
   */
  async exists(): Promise<boolean> {
    return storageService.hasVault();
  }

  /**
   * Create a new vault with a master password.
   */
  async create(password: string): Promise<void> {
    if (await this.exists()) {
      throw new Error('Vault already exists');
    }

    const { key, salt } = await cryptoService.deriveKey(password);
    const emptyKeys: ApiKeyEntry[] = [];
    const data = JSON.stringify(emptyKeys);
    const { ciphertext, iv } = await cryptoService.encrypt(data, key);

    const vault: VaultData = {
      encrypted: cryptoService.toBase64(ciphertext),
      salt: cryptoService.toBase64(salt),
      iv: cryptoService.toBase64(iv),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await storageService.saveVault(vault);

    this.encryptionKey = key;
    this.decryptedKeys = emptyKeys;
  }

  /**
   * Unlock the vault with the master password.
   */
  async unlock(password: string): Promise<boolean> {
    const vault = await storageService.getVault();
    if (!vault) {
      throw new Error('Vault does not exist');
    }

    try {
      const salt = cryptoService.fromBase64(vault.salt);
      const { key } = await cryptoService.deriveKey(password, salt);

      const ciphertext = cryptoService.fromBase64(vault.encrypted);
      const iv = cryptoService.fromBase64(vault.iv);

      const decrypted = await cryptoService.decrypt(ciphertext, key, iv);
      const keys = JSON.parse(decrypted) as ApiKeyEntry[];

      this.encryptionKey = key;
      this.decryptedKeys = keys;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lock the vault (clear decrypted data from memory).
   */
  lock(): void {
    if (this.encryptionKey) {
      cryptoService.zeroMemory(this.encryptionKey);
      this.encryptionKey = null;
    }
    this.decryptedKeys = null;
  }

  /**
   * Check if vault is unlocked.
   */
  isUnlocked(): boolean {
    return this.decryptedKeys !== null && this.encryptionKey !== null;
  }

  /**
   * Get all API keys (must be unlocked).
   */
  getKeys(): ApiKeyEntry[] {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked');
    }
    return [...this.decryptedKeys!];
  }

  /**
   * Get API key for a specific provider.
   */
  getKeyForProvider(provider: LlmProvider): ApiKeyEntry | undefined {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked');
    }
    return this.decryptedKeys!.find((k) => k.provider === provider);
  }

  /**
   * Add a new API key.
   */
  async addKey(
    provider: LlmProvider,
    name: string,
    apiKey: string,
    endpointUrl?: string
  ): Promise<ApiKeyEntry> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked');
    }

    const entry: ApiKeyEntry = {
      id: uuidv4(),
      provider,
      name,
      apiKey,
      endpointUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.decryptedKeys!.push(entry);
    await this.saveVault();

    // Save custom endpoint if provided
    if (endpointUrl && provider === 'lm_studio') {
      await storageService.saveCustomEndpoint(entry.id, endpointUrl);
    }

    return entry;
  }

  /**
   * Update an existing API key.
   */
  async updateKey(
    id: string,
    updates: Partial<Pick<ApiKeyEntry, 'name' | 'apiKey' | 'endpointUrl'>>
  ): Promise<ApiKeyEntry | undefined> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked');
    }

    const index = this.decryptedKeys!.findIndex((k) => k.id === id);
    if (index === -1) return undefined;

    const key = this.decryptedKeys![index];
    const updated: ApiKeyEntry = {
      ...key,
      ...updates,
      updatedAt: Date.now(),
    };

    this.decryptedKeys![index] = updated;
    await this.saveVault();

    // Update custom endpoint if changed
    if (updates.endpointUrl !== undefined && key.provider === 'lm_studio') {
      await storageService.saveCustomEndpoint(id, updates.endpointUrl);
    }

    return updated;
  }

  /**
   * Delete an API key.
   */
  async deleteKey(id: string): Promise<boolean> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked');
    }

    const index = this.decryptedKeys!.findIndex((k) => k.id === id);
    if (index === -1) return false;

    this.decryptedKeys!.splice(index, 1);
    await this.saveVault();

    return true;
  }

  /**
   * Change the master password.
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    // First verify old password
    const vault = await storageService.getVault();
    if (!vault) return false;

    try {
      const oldSalt = cryptoService.fromBase64(vault.salt);
      const { key: oldKey } = await cryptoService.deriveKey(oldPassword, oldSalt);

      const ciphertext = cryptoService.fromBase64(vault.encrypted);
      const iv = cryptoService.fromBase64(vault.iv);

      const decrypted = await cryptoService.decrypt(ciphertext, oldKey, iv);
      const keys = JSON.parse(decrypted) as ApiKeyEntry[];

      // Re-encrypt with new password
      const { key: newKey, salt: newSalt } = await cryptoService.deriveKey(newPassword);
      const data = JSON.stringify(keys);
      const { ciphertext: newCiphertext, iv: newIv } = await cryptoService.encrypt(data, newKey);

      const newVault: VaultData = {
        encrypted: cryptoService.toBase64(newCiphertext),
        salt: cryptoService.toBase64(newSalt),
        iv: cryptoService.toBase64(newIv),
        createdAt: vault.createdAt,
        updatedAt: Date.now(),
      };

      await storageService.saveVault(newVault);

      // Update in-memory state
      if (this.encryptionKey) {
        cryptoService.zeroMemory(this.encryptionKey);
      }
      this.encryptionKey = newKey;
      this.decryptedKeys = keys;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save the current decrypted keys to storage.
   */
  private async saveVault(): Promise<void> {
    if (!this.isUnlocked()) {
      throw new Error('Vault is locked');
    }

    const data = JSON.stringify(this.decryptedKeys);
    const { ciphertext, iv } = await cryptoService.encrypt(data, this.encryptionKey!);

    const vault = await storageService.getVault();
    if (!vault) {
      throw new Error('Vault does not exist');
    }

    const updatedVault: VaultData = {
      ...vault,
      encrypted: cryptoService.toBase64(ciphertext),
      iv: cryptoService.toBase64(iv),
      updatedAt: Date.now(),
    };

    await storageService.saveVault(updatedVault);
  }
}

export const vaultService = new VaultService();
