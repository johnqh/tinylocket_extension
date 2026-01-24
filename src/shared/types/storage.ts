import type { LlmProvider } from './providers';

// Encrypted vault data
export interface VaultData {
  encrypted: string; // Base64 encoded encrypted data
  salt: string; // Base64 encoded salt
  iv: string; // Base64 encoded IV
  createdAt: number;
  updatedAt: number;
}

// Decrypted API key entry
export interface ApiKeyEntry {
  id: string;
  provider: LlmProvider;
  name: string;
  apiKey: string;
  endpointUrl?: string; // For lm_studio
  createdAt: number;
  updatedAt: number;
}

// Whitelisted domain
export interface WhitelistedDomain {
  domain: string;
  addedAt: number;
}

// Request history entry (metadata only, no payloads)
export interface RequestHistoryEntry {
  id: string;
  timestamp: number;
  provider: LlmProvider;
  endpoint: string;
  domain: string;
  status: number;
  durationMs: number;
  tokensUsed?: number;
}

// Settings stored in chrome.storage.local
export interface ExtensionSettings {
  autoLockMinutes: number;
  historyEnabled: boolean;
  maxHistoryEntries: number;
}

// All stored data structure
export interface StoredData {
  vault?: VaultData;
  whitelistedDomains: WhitelistedDomain[];
  requestHistory: RequestHistoryEntry[];
  settings: ExtensionSettings;
  customEndpoints: Record<string, string>; // For lm_studio custom URLs
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  autoLockMinutes: 30,
  historyEnabled: true,
  maxHistoryEntries: 1000,
};
