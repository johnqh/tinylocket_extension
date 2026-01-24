import { create } from 'zustand';
import { vaultService, storageService } from '../../shared/services';
import type { ApiKeyEntry, WhitelistedDomain, RequestHistoryEntry, ExtensionSettings } from '../../shared/types/storage';

type Page = 'setup' | 'unlock' | 'home' | 'keys' | 'domains' | 'history' | 'settings';

interface PopupState {
  // Navigation
  currentPage: Page;
  setCurrentPage: (page: Page) => void;

  // Auth state
  isUnlocked: boolean;
  hasVault: boolean;
  checkAuthState: () => Promise<void>;

  // Keys
  keys: ApiKeyEntry[];
  loadKeys: () => void;

  // Domains
  domains: WhitelistedDomain[];
  loadDomains: () => Promise<void>;
  addDomain: (domain: string) => Promise<void>;
  removeDomain: (domain: string) => Promise<void>;

  // History
  history: RequestHistoryEntry[];
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;

  // Settings
  settings: ExtensionSettings | null;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<ExtensionSettings>) => Promise<void>;

  // Actions
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  createVault: (password: string) => Promise<void>;
  addKey: (provider: string, name: string, apiKey: string, endpointUrl?: string) => Promise<void>;
  updateKey: (id: string, updates: Partial<Pick<ApiKeyEntry, 'name' | 'apiKey' | 'endpointUrl'>>) => Promise<void>;
  deleteKey: (id: string) => Promise<void>;
}

export const usePopupStore = create<PopupState>((set, get) => ({
  // Navigation
  currentPage: 'home',
  setCurrentPage: (page) => set({ currentPage: page }),

  // Auth state
  isUnlocked: false,
  hasVault: false,
  checkAuthState: async () => {
    const hasVault = await vaultService.exists();
    const isUnlocked = vaultService.isUnlocked();

    let currentPage: Page = 'home';
    if (!hasVault) {
      currentPage = 'setup';
    } else if (!isUnlocked) {
      currentPage = 'unlock';
    }

    set({ hasVault, isUnlocked, currentPage });
  },

  // Keys
  keys: [],
  loadKeys: () => {
    if (!vaultService.isUnlocked()) {
      set({ keys: [] });
      return;
    }
    const keys = vaultService.getKeys();
    set({ keys });
  },

  // Domains
  domains: [],
  loadDomains: async () => {
    const domains = await storageService.getWhitelistedDomains();
    set({ domains });
  },
  addDomain: async (domain) => {
    await storageService.addWhitelistedDomain(domain);
    await get().loadDomains();
  },
  removeDomain: async (domain) => {
    await storageService.removeWhitelistedDomain(domain);
    await get().loadDomains();
  },

  // History
  history: [],
  loadHistory: async () => {
    const history = await storageService.getRequestHistory();
    set({ history: history.reverse() }); // Most recent first
  },
  clearHistory: async () => {
    await storageService.clearRequestHistory();
    set({ history: [] });
  },

  // Settings
  settings: null,
  loadSettings: async () => {
    const settings = await storageService.getSettings();
    set({ settings });
  },
  updateSettings: async (updates) => {
    await storageService.updateSettings(updates);
    await get().loadSettings();
  },

  // Actions
  unlock: async (password) => {
    const success = await vaultService.unlock(password);
    if (success) {
      set({ isUnlocked: true, currentPage: 'home' });
      get().loadKeys();
    }
    return success;
  },

  lock: () => {
    vaultService.lock();
    set({ isUnlocked: false, currentPage: 'unlock', keys: [] });
  },

  createVault: async (password) => {
    await vaultService.create(password);
    set({ hasVault: true, isUnlocked: true, currentPage: 'home' });
  },

  addKey: async (provider, name, apiKey, endpointUrl) => {
    await vaultService.addKey(provider as any, name, apiKey, endpointUrl);
    get().loadKeys();
  },

  updateKey: async (id, updates) => {
    await vaultService.updateKey(id, updates);
    get().loadKeys();
  },

  deleteKey: async (id) => {
    await vaultService.deleteKey(id);
    get().loadKeys();
  },
}));
