import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredAuthInfo,
  setStoredAuthInfo,
  clearStoredAuthInfo,
  getStoredSettings,
  setStoredSettings,
} from '../../utils/storage';
import { mockStorageLocal } from '../setup';
import type { AuthInfo } from '../../types/vault';

describe('Storage Utility', () => {
  beforeEach(async () => {
    await mockStorageLocal.clear();
  });

  describe('Auth Info Storage', () => {
    it('returns null when no auth info is stored', async () => {
      const auth = await getStoredAuthInfo();
      expect(auth).toBeNull();
    });

    it('stores and retrieves valid auth info', async () => {
      const sampleAuth: AuthInfo = {
        instanceUrl: 'https://vault.example.com',
        user: 'admin@example.com',
        authType: 'token',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        isConnected: true,
      };

      await setStoredAuthInfo(sampleAuth);
      const retrieved = await getStoredAuthInfo();

      expect(retrieved).not.toBeNull();
      expect(retrieved?.instanceUrl).toBe('https://vault.example.com');
      expect(retrieved?.apiKey).toBe('test-key');
      expect(retrieved?.isConnected).toBe(true);
    });

    it('clears stored auth info on logout', async () => {
      await setStoredAuthInfo({
        instanceUrl: 'https://vault.example.com',
        user: 'admin@example.com',
        authType: 'token',
        apiKey: 'key',
        apiSecret: 'secret',
        isConnected: true,
      });

      await clearStoredAuthInfo();
      const afterClear = await getStoredAuthInfo();
      expect(afterClear).toBeNull();
    });
  });

  describe('Settings Storage', () => {
    it('returns default settings if none have been set', async () => {
      const settings = await getStoredSettings();
      expect(settings).toEqual({
        autoFillCurrentTab: true,
        clearClipboardAfterSeconds: 30,
        theme: 'system',
      });
    });

    it('updates partial settings and preserves other defaults', async () => {
      await setStoredSettings({
        theme: 'dark',
        autoFillCurrentTab: false,
      });

      const updated = await getStoredSettings();
      expect(updated.theme).toBe('dark');
      expect(updated.autoFillCurrentTab).toBe(false);
      expect(updated.clearClipboardAfterSeconds).toBe(30); // preserved default
    });
  });
});
