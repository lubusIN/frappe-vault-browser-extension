import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useVaultAuth, authState, isAuthLoading, authError } from '../../composables/useVaultAuth';
import { mockStorageLocal } from '../setup';
import type { AuthInfo } from '../../types/vault';

describe('useVaultAuth Composable', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    await mockStorageLocal.clear();
    authState.value = null;
    isAuthLoading.value = false;
    authError.value = null;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('loginWithToken', () => {
    it('successfully connects when valid API credentials return a logged in user', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'administrator@frappe.io' }),
      } as Response);

      const { loginWithToken } = useVaultAuth();
      const success = await loginWithToken(
        'https://vault.example.com/',
        'api-key-123',
        'api-secret-456'
      );

      expect(success).toBe(true);
      expect(authState.value).not.toBeNull();
      expect(authState.value?.instanceUrl).toBe('https://vault.example.com');
      expect(authState.value?.user).toBe('administrator@frappe.io');
      expect(authState.value?.apiKey).toBe('api-key-123');
      expect(authState.value?.isConnected).toBe(true);
      expect(authError.value).toBeNull();

      // Check request was sent with token authorization header
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://vault.example.com/api/method/frappe.auth.get_logged_user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token api-key-123:api-secret-456',
          }),
        })
      );
    });

    it('rejects connection if server returns Guest user', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Guest' }),
      } as Response);

      const { loginWithToken } = useVaultAuth();
      const success = await loginWithToken(
        'https://vault.example.com',
        'wrong-key',
        'wrong-secret'
      );

      expect(success).toBe(false);
      expect(authState.value).toBeNull();
      expect(authError.value).toContain('Guest');
    });

    it('sets authError when server returns 401/403', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      } as Response);

      const { loginWithToken } = useVaultAuth();
      const success = await loginWithToken(
        'https://vault.example.com',
        'invalid-key',
        'invalid-secret'
      );

      expect(success).toBe(false);
      expect(authState.value).toBeNull();
      expect(authError.value).toContain('Invalid API Key');
    });

    it('handles network failure gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      const { loginWithToken } = useVaultAuth();
      const success = await loginWithToken('https://offline.example.com', 'key', 'secret');

      expect(success).toBe(false);
      expect(authState.value).toBeNull();
      expect(authError.value).toContain('Network offline');
    });
  });

  describe('loginWithPassword', () => {
    it('successfully logs in with valid username and password', async () => {
      globalThis.fetch = vi
        .fn()
        // First call: /api/method/login
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ full_name: 'Test Administrator' }),
        } as Response)
        // Second call: /api/method/frappe.auth.get_logged_user
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'admin@example.com' }),
        } as Response);

      const { loginWithPassword } = useVaultAuth();
      const success = await loginWithPassword(
        'vault.example.com',
        'admin@example.com',
        'Secret123!'
      );

      expect(success).toBe(true);
      expect(authState.value?.instanceUrl).toBe('https://vault.example.com');
      expect(authState.value?.user).toBe('admin@example.com');
      expect(authState.value?.fullName).toBe('Test Administrator');
      expect(authState.value?.authType).toBe('password');
    });

    it('handles invalid credentials on login endpoint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid username or password' }),
      } as Response);

      const { loginWithPassword } = useVaultAuth();
      const success = await loginWithPassword(
        'https://vault.example.com',
        'admin',
        'wrongpassword'
      );

      expect(success).toBe(false);
      expect(authState.value).toBeNull();
      expect(authError.value).toContain('Invalid username or password');
    });
  });

  describe('logout', () => {
    it('resets auth state and clears storage', async () => {
      const { loginWithToken, logout } = useVaultAuth();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'admin@example.com' }),
      } as Response);

      await loginWithToken('https://vault.example.com', 'key', 'secret');
      expect(authState.value).not.toBeNull();

      await logout();

      expect(authState.value).toBeNull();
      expect(authError.value).toBeNull();
      expect(mockStorageLocal.remove).toHaveBeenCalled();
    });
  });

  describe('initAuth', () => {
    it('restores stored auth session on startup', async () => {
      const storedAuth: AuthInfo = {
        instanceUrl: 'https://vault.example.com',
        user: 'admin@example.com',
        authType: 'token',
        apiKey: 'key',
        apiSecret: 'secret',
        isConnected: true,
      };
      await mockStorageLocal.set({ frappe_vault_auth_info: storedAuth });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'admin@example.com' }),
      } as Response);

      const { initAuth } = useVaultAuth();
      await initAuth();

      expect(authState.value?.instanceUrl).toBe('https://vault.example.com');
      expect(authState.value?.isConnected).toBe(true);
    });
  });
});
