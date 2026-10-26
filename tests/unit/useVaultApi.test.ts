import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useVaultApi } from '../../composables/useVaultApi';
import { authState } from '../../composables/useVaultAuth';

describe('useVaultApi Composable', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    authState.value = null;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('throws an error if makeRequest is called while unauthenticated', async () => {
    const { getSecrets } = useVaultApi();
    await expect(getSecrets()).rejects.toThrow('Not connected to a Frappe Vault instance');
  });

  describe('Authenticated API requests', () => {
    beforeEach(() => {
      authState.value = {
        instanceUrl: 'https://vault.example.com',
        user: 'admin@example.com',
        authType: 'token',
        apiKey: 'my-key',
        apiSecret: 'my-secret',
        isConnected: true,
      };
    });

    it('getSecrets shapes query parameters and includes token Authorization header', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: {
            secrets: [
              {
                name: 'sec-1',
                title: 'GitHub Personal Access Token',
                secret_type: 'API Key',
              },
            ],
            total: 1,
          },
        }),
      } as Response);

      const { getSecrets } = useVaultApi();
      const res = await getSecrets({
        search: 'GitHub',
        secret_type: 'API Key',
        limit: 10,
      });

      expect(res.secrets.length).toBe(1);
      expect(res.secrets[0]?.title).toBe('GitHub Personal Access Token');

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://vault.example.com/api/method/frappe_vault.api.secrets.list?search=GitHub&secret_type=API+Key&bookmarks_only=0&limit=10&offset=0&order_by=modified+desc',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'token my-key:my-secret',
          }),
        })
      );
    });

    it('createSecret sends JSON payload via POST', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: {
            name: 'sec-new',
            title: 'New Database Password',
          },
        }),
      } as Response);

      const { createSecret } = useVaultApi();
      const created = await createSecret({
        title: 'New Database Password',
        secret_type: 'Password',
        username: 'db_admin',
        password: 'TopSecretPassword99!',
      });

      expect(created.name).toBe('sec-new');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://vault.example.com/api/method/frappe_vault.api.secrets.create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'token my-key:my-secret',
          }),
          body: JSON.stringify({
            title: 'New Database Password',
            secret_type: 'Password',
            username: 'db_admin',
            password: 'TopSecretPassword99!',
          }),
        })
      );
    });

    it('deleteSecret sends delete request with secret name', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: true }),
      } as Response);

      const { deleteSecret } = useVaultApi();
      const success = await deleteSecret('sec-to-delete');

      expect(success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://vault.example.com/api/method/frappe_vault.api.secrets.delete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'sec-to-delete' }),
        })
      );
    });

    it('formats server error messages properly', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ message: 'You do not have permission to view this secret' }),
      } as Response);

      const { getSecret } = useVaultApi();
      await expect(getSecret('forbidden-sec')).rejects.toThrow(
        'You do not have permission to view this secret'
      );
    });

    it('toggleBookmark calls POST on toggle_bookmark endpoint with secret name', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: { name: 'sec-star', is_bookmark: 1 } }),
      } as Response);

      const { toggleBookmark } = useVaultApi();
      const res = await toggleBookmark('sec-star');

      expect(res.is_bookmark).toBe(1);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://vault.example.com/api/method/frappe_vault.api.secrets.toggle_bookmark',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'sec-star' }),
        })
      );
    });
  });
});
