import { authState } from './useVaultAuth';
import type {
  VaultSecretSummary,
  VaultSecretDetail,
  TotpResult,
  VaultFolder,
} from '../types/vault';

export function useVaultApi() {
  async function makeRequest<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST';
      params?: Record<string, any>;
      body?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const auth = authState.value;
    if (!auth || !auth.instanceUrl) {
      throw new Error('Not connected to a Frappe Vault instance');
    }

    const { method = 'GET', params, body } = options;
    let url = `${auth.instanceUrl}/api/method/${path}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      });
      const queryStr = searchParams.toString();
      if (queryStr) {
        url += (url.includes('?') ? '&' : '?') + queryStr;
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (auth.authType === 'token' && auth.apiKey && auth.apiSecret) {
      headers['Authorization'] = `token ${auth.apiKey}:${auth.apiSecret}`;
    }

    const reqInit: RequestInit = {
      method,
      headers,
      credentials: auth.authType === 'password' ? 'include' : 'same-origin',
    };

    if (body && method === 'POST') {
      headers['Content-Type'] = 'application/json';
      reqInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, reqInit);
    if (!response.ok) {
      let errMsg = `Request failed: ${response.status} ${response.statusText}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.message || errJson.exc || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const resJson = await response.json();
    return (resJson.message !== undefined ? resJson.message : resJson) as T;
  }

  async function getSecrets(params: {
    search?: string;
    secret_type?: string;
    folder?: string;
    bookmarks_only?: boolean;
    limit?: number;
    offset?: number;
    order_by?: string;
  } = {}): Promise<{ secrets: VaultSecretSummary[]; total: number }> {
    const res = await makeRequest<{ secrets: VaultSecretSummary[]; total: number }>(
      'frappe_vault.api.secrets.list',
      {
        method: 'GET',
        params: {
          search: params.search,
          secret_type: params.secret_type,
          folder: params.folder,
          bookmarks_only: params.bookmarks_only ? 1 : 0,
          limit: params.limit || 50,
          offset: params.offset || 0,
          order_by: params.order_by || 'modified desc',
        },
      }
    );
    return res;
  }

  async function getSecret(name: string, decrypt: boolean = false): Promise<VaultSecretDetail> {
    return await makeRequest<VaultSecretDetail>('frappe_vault.api.secrets.get', {
      method: 'GET',
      params: { name, decrypt: decrypt ? 1 : 0 },
    });
  }

  async function decryptSecret(name: string): Promise<VaultSecretDetail> {
    try {
      // 1. Primary: GET on frappe_vault.api.secrets.get with decrypt=1 (CSRF-safe for browser extensions)
      const res = await makeRequest<VaultSecretDetail>('frappe_vault.api.secrets.get', {
        method: 'GET',
        params: { name, decrypt: 1 },
      });
      if (res) return res;
    } catch (err) {
      console.warn('GET secrets.get with decrypt=1 failed, trying secrets.decrypt:', err);
    }

    try {
      // 2. Fallback: GET on frappe_vault.api.secrets.decrypt (whitelisted methods accept GET query params in Frappe)
      const res = await makeRequest<VaultSecretDetail>('frappe_vault.api.secrets.decrypt', {
        method: 'GET',
        params: { name },
      });
      if (res) return res;
    } catch (err) {
      console.warn('GET secrets.decrypt failed, trying POST:', err);
    }

    // 3. Fallback: POST on frappe_vault.api.secrets.decrypt
    return await makeRequest<VaultSecretDetail>('frappe_vault.api.secrets.decrypt', {
      method: 'POST',
      body: { name },
    });
  }

  async function getTotp(name: string): Promise<TotpResult> {
    return await makeRequest<TotpResult>('frappe_vault.api.secrets.get_totp', {
      method: 'GET',
      params: { name },
    });
  }

  async function createSecret(data: Record<string, any>): Promise<{ name: string; title: string }> {
    return await makeRequest<{ name: string; title: string }>('frappe_vault.api.secrets.create', {
      method: 'POST',
      body: data,
    });
  }

  async function updateSecret(name: string, data: Record<string, any>): Promise<{ name: string; title: string }> {
    return await makeRequest<{ name: string; title: string }>('frappe_vault.api.secrets.update', {
      method: 'POST',
      body: { name, ...data },
    });
  }

  async function deleteSecret(name: string): Promise<{ name: string; title: string }> {
    return await makeRequest<{ name: string; title: string }>('frappe_vault.api.secrets.delete', {
      method: 'POST',
      body: { name },
    });
  }

  async function toggleBookmark(name: string): Promise<{ name: string; is_bookmark: number }> {
    return await makeRequest<{ name: string; is_bookmark: number }>('frappe_vault.api.secrets.toggle_bookmark', {
      method: 'POST',
      body: { name },
    });
  }

  async function getFolders(): Promise<VaultFolder[]> {
    try {
      const res = await makeRequest<VaultFolder[]>('frappe_vault.api.folders.get_all', {
        method: 'GET',
      });
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  }

  return {
    getSecrets,
    getSecret,
    decryptSecret,
    getTotp,
    createSecret,
    updateSecret,
    deleteSecret,
    toggleBookmark,
    getFolders,
  };
}
