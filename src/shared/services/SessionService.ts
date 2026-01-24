import { vaultService } from './VaultService';
import { storageService } from './StorageService';
import { DEFAULT_AUTO_LOCK_MINUTES } from '../constants';

const AUTO_LOCK_ALARM_NAME = 'tinylocket-auto-lock';

/**
 * Service for managing session state (lock/unlock, auto-lock).
 */
export class SessionService {
  private lastActivity: number = Date.now();

  /**
   * Initialize the session service.
   * Should be called when the background service worker starts.
   */
  async init(): Promise<void> {
    // Set up alarm listener for auto-lock
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === AUTO_LOCK_ALARM_NAME) {
        this.handleAutoLock();
      }
    });

    // Reset auto-lock timer on startup if unlocked
    if (vaultService.isUnlocked()) {
      await this.resetAutoLockTimer();
    }
  }

  /**
   * Record user activity to reset auto-lock timer.
   */
  async recordActivity(): Promise<void> {
    this.lastActivity = Date.now();
    if (vaultService.isUnlocked()) {
      await this.resetAutoLockTimer();
    }
  }

  /**
   * Reset the auto-lock timer based on settings.
   */
  async resetAutoLockTimer(): Promise<void> {
    const settings = await storageService.getSettings();
    const minutes = settings.autoLockMinutes;

    // Clear existing alarm
    await chrome.alarms.clear(AUTO_LOCK_ALARM_NAME);

    // If auto-lock is enabled (not 0), set a new alarm
    if (minutes > 0) {
      chrome.alarms.create(AUTO_LOCK_ALARM_NAME, {
        delayInMinutes: minutes,
      });
    }
  }

  /**
   * Handle auto-lock alarm.
   */
  private async handleAutoLock(): Promise<void> {
    const settings = await storageService.getSettings();
    const minutes = settings.autoLockMinutes;

    if (minutes === 0) {
      // Auto-lock is disabled
      return;
    }

    const inactiveMs = Date.now() - this.lastActivity;
    const thresholdMs = minutes * 60 * 1000;

    if (inactiveMs >= thresholdMs) {
      // Lock the vault due to inactivity
      vaultService.lock();

      // Notify any open popups
      try {
        await chrome.runtime.sendMessage({ type: 'SESSION_LOCKED' });
      } catch {
        // No listeners, ignore
      }
    } else {
      // Still active, reset timer for remaining time
      const remainingMs = thresholdMs - inactiveMs;
      const remainingMinutes = Math.ceil(remainingMs / 60000);

      chrome.alarms.create(AUTO_LOCK_ALARM_NAME, {
        delayInMinutes: remainingMinutes,
      });
    }
  }

  /**
   * Update auto-lock timeout setting.
   */
  async setAutoLockMinutes(minutes: number): Promise<void> {
    await storageService.updateSettings({ autoLockMinutes: minutes });
    await this.resetAutoLockTimer();
  }

  /**
   * Get current auto-lock timeout setting.
   */
  async getAutoLockMinutes(): Promise<number> {
    const settings = await storageService.getSettings();
    return settings.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES;
  }

  /**
   * Check if the vault is currently unlocked.
   */
  isUnlocked(): boolean {
    return vaultService.isUnlocked();
  }

  /**
   * Lock the vault.
   */
  lock(): void {
    vaultService.lock();
    chrome.alarms.clear(AUTO_LOCK_ALARM_NAME);
  }

  /**
   * Unlock the vault with password.
   */
  async unlock(password: string): Promise<boolean> {
    const success = await vaultService.unlock(password);
    if (success) {
      await this.resetAutoLockTimer();
    }
    return success;
  }
}

export const sessionService = new SessionService();
