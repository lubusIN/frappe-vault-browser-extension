import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredAuthInfo,
  setStoredAuthInfo,
  clearStoredAuthInfo,
  getStoredSettings,
  setStoredSettings,
  getStoredConnectDraft,
  setStoredConnectDraft,
  getStoredSecretsCache,
  setStoredSecretsCache,
  clearStoredSecretsCache,
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

  describe('Connect Draft Storage', () => {
    it('returns null when no connect draft is stored', async () => {
      const draft = await getStoredConnectDraft();
      expect(draft).toBeNull();
    });

    it('stores and retrieves connection draft', async () => {
      await setStoredConnectDraft({
        instanceUrl: 'https://vault.example.com',
        authMode: 'password',
        username: 'admin@example.com',
      });

      const draft = await getStoredConnectDraft();
      expect(draft).not.toBeNull();
      expect(draft?.instanceUrl).toBe('https://vault.example.com');
      expect(draft?.authMode).toBe('password');
      expect(draft?.username).toBe('admin@example.com');
    });
  });

  describe('Secrets Cache Storage', () => {
    it('returns null when no cache is stored', async () => {
      const cache = await getStoredSecretsCache();
      expect(cache).toBeNull();
    });

    it('stores and retrieves cached secrets data', async () => {
      const sampleCache = {
        secrets: [
          {
            name: 'sec-1',
            title: 'Sample Secret',
            secret_type: 'Password' as const,
            is_bookmark: 0,
            username: 'sample_user',
          },
        ],
        total: 1,
        updatedAt: 1234567890,
      };

      await setStoredSecretsCache(sampleCache);
      const retrieved = await getStoredSecretsCache();

      expect(retrieved).not.toBeNull();
      expect(retrieved?.secrets).toHaveLength(1);
      expect(retrieved?.secrets[0].name).toBe('sec-1');
      expect(retrieved?.total).toBe(1);
      expect(retrieved?.updatedAt).toBe(1234567890);
    });

    it('clears stored secrets cache', async () => {
      await setStoredSecretsCache({
        secrets: [],
        total: 0,
        updatedAt: Date.now(),
      });

      await clearStoredSecretsCache();
      const afterClear = await getStoredSecretsCache();
      expect(afterClear).toBeNull();
    });
  });
});
