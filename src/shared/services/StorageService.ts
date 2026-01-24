import type {
  StoredData,
  VaultData,
  WhitelistedDomain,
  RequestHistoryEntry,
  ExtensionSettings,
} from '../types/storage';
import { DEFAULT_SETTINGS } from '../types/storage';

/**
 * Service for interacting with Chrome extension storage.
 */
export class StorageService {
  private cache: Partial<StoredData> | null = null;

  /**
   * Get all stored data.
   */
  async getAll(): Promise<StoredData> {
    if (this.cache) {
      return this.cache as StoredData;
    }

    const result = await chrome.storage.local.get([
      'vault',
      'whitelistedDomains',
      'requestHistory',
      'settings',
      'customEndpoints',
    ]);

    const data: StoredData = {
      vault: result.vault,
      whitelistedDomains: result.whitelistedDomains ?? [],
      requestHistory: result.requestHistory ?? [],
      settings: { ...DEFAULT_SETTINGS, ...result.settings },
      customEndpoints: result.customEndpoints ?? {},
    };

    this.cache = data;
    return data;
  }

  /**
   * Get vault data.
   */
  async getVault(): Promise<VaultData | undefined> {
    const data = await this.getAll();
    return data.vault;
  }

  /**
   * Save vault data.
   */
  async saveVault(vault: VaultData): Promise<void> {
    await chrome.storage.local.set({ vault });
    if (this.cache) {
      this.cache.vault = vault;
    }
  }

  /**
   * Get whitelisted domains.
   */
  async getWhitelistedDomains(): Promise<WhitelistedDomain[]> {
    const data = await this.getAll();
    return data.whitelistedDomains;
  }

  /**
   * Add a domain to the whitelist.
   */
  async addWhitelistedDomain(domain: string): Promise<void> {
    const domains = await this.getWhitelistedDomains();
    const existing = domains.find((d) => d.domain === domain);
    if (existing) return;

    const newDomains = [...domains, { domain, addedAt: Date.now() }];
    await chrome.storage.local.set({ whitelistedDomains: newDomains });
    if (this.cache) {
      this.cache.whitelistedDomains = newDomains;
    }
  }

  /**
   * Remove a domain from the whitelist.
   */
  async removeWhitelistedDomain(domain: string): Promise<void> {
    const domains = await this.getWhitelistedDomains();
    const newDomains = domains.filter((d) => d.domain !== domain);
    await chrome.storage.local.set({ whitelistedDomains: newDomains });
    if (this.cache) {
      this.cache.whitelistedDomains = newDomains;
    }
  }

  /**
   * Check if a domain is whitelisted.
   */
  async isDomainWhitelisted(domain: string): Promise<boolean> {
    const domains = await this.getWhitelistedDomains();
    return domains.some((d) => d.domain === domain);
  }

  /**
   * Get request history.
   */
  async getRequestHistory(): Promise<RequestHistoryEntry[]> {
    const data = await this.getAll();
    return data.requestHistory;
  }

  /**
   * Add a request to history.
   */
  async addRequestHistory(entry: RequestHistoryEntry): Promise<void> {
    const data = await this.getAll();
    if (!data.settings.historyEnabled) return;

    let history = [...data.requestHistory, entry];

    // Trim history if it exceeds max entries
    if (history.length > data.settings.maxHistoryEntries) {
      history = history.slice(-data.settings.maxHistoryEntries);
    }

    await chrome.storage.local.set({ requestHistory: history });
    if (this.cache) {
      this.cache.requestHistory = history;
    }
  }

  /**
   * Clear request history.
   */
  async clearRequestHistory(): Promise<void> {
    await chrome.storage.local.set({ requestHistory: [] });
    if (this.cache) {
      this.cache.requestHistory = [];
    }
  }

  /**
   * Get settings.
   */
  async getSettings(): Promise<ExtensionSettings> {
    const data = await this.getAll();
    return data.settings;
  }

  /**
   * Update settings.
   */
  async updateSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await this.getSettings();
    const newSettings = { ...current, ...settings };
    await chrome.storage.local.set({ settings: newSettings });
    if (this.cache) {
      this.cache.settings = newSettings;
    }
  }

  /**
   * Get custom endpoints for lm_studio.
   */
  async getCustomEndpoints(): Promise<Record<string, string>> {
    const data = await this.getAll();
    return data.customEndpoints;
  }

  /**
   * Save a custom endpoint.
   */
  async saveCustomEndpoint(keyId: string, url: string): Promise<void> {
    const endpoints = await this.getCustomEndpoints();
    const newEndpoints = { ...endpoints, [keyId]: url };
    await chrome.storage.local.set({ customEndpoints: newEndpoints });
    if (this.cache) {
      this.cache.customEndpoints = newEndpoints;
    }
  }

  /**
   * Clear cache (useful after data changes from other contexts).
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Check if vault exists (user has set up a password).
   */
  async hasVault(): Promise<boolean> {
    const vault = await this.getVault();
    return vault !== undefined;
  }

  /**
   * Clear all data (for reset/uninstall).
   */
  async clearAll(): Promise<void> {
    await chrome.storage.local.clear();
    this.cache = null;
  }
}

export const storageService = new StorageService();
