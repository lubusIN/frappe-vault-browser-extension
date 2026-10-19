import { getStoredAuthInfo, getStoredSettings } from '../utils/storage';
import { matchesDomain } from '../utils/helpers';
import type { AuthInfo, VaultSecretSummary } from '../types/vault';

interface SecretsCache {
  timestamp: number;
  secrets: VaultSecretSummary[];
}

let secretsCache: SecretsCache | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds cache for instant in-page dropdowns

export default defineBackground(() => {
  console.log('[Frappe Vault] Background service worker initialized');

  // Handle messages from popup or content script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PING') {
      sendResponse({ status: 'OK' });
      return true;
    }

    if (message.type === 'VAULT_GET_MATCHING_SECRETS') {
      let targetDomain = message.payload?.domain;
      // If requested from a tab's content script, strictly enforce the tab's genuine origin
      if (sender.tab?.url) {
        try {
          targetDomain = new URL(sender.tab.url).hostname;
        } catch {}
      }

      handleGetMatchingSecrets(targetDomain)
        .then(secrets => sendResponse({ secrets }))
        .catch(err => {
          console.error('[Frappe Vault] Failed to get matching secrets:', err);
          sendResponse({ secrets: [] });
        });
      return true; // asynchronous response
    }

    if (message.type === 'VAULT_DECRYPT_SECRET') {
      handleDecryptSecret(message.payload?.secretName, sender.tab?.url)
        .then(data => sendResponse(data))
        .catch(err => {
          console.error('[Frappe Vault] Failed to decrypt secret for autofill:', err);
          sendResponse({ error: String(err) });
        });
      return true; // asynchronous response
    }
  });

  async function makeVaultRequest<T = any>(
    auth: AuthInfo,
    path: string,
    options: {
      method?: 'GET' | 'POST';
      params?: Record<string, any>;
      body?: Record<string, any>;
    } = {}
  ): Promise<T> {
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

  async function handleGetMatchingSecrets(domain?: string): Promise<VaultSecretSummary[]> {
    if (!domain) return [];

    const settings = await getStoredSettings();
    if (!settings.autoFillCurrentTab) {
      return [];
    }

    const auth = await getStoredAuthInfo();
    if (!auth || !auth.isConnected || !auth.instanceUrl) {
      return [];
    }

    const now = Date.now();
    let allSecrets: VaultSecretSummary[] = [];

    if (secretsCache && now - secretsCache.timestamp < CACHE_TTL_MS) {
      allSecrets = secretsCache.secrets;
    } else {
      try {
        const res = await makeVaultRequest<{ secrets: VaultSecretSummary[]; total: number }>(
          auth,
          'frappe_vault.api.secrets.list',
          {
            method: 'GET',
            params: { limit: 100, order_by: 'modified desc' },
          }
        );
        allSecrets = res.secrets || [];
        secretsCache = { timestamp: now, secrets: allSecrets };
      } catch (err) {
        console.warn('[Frappe Vault] Background fetch secrets failed:', err);
        if (secretsCache) {
          allSecrets = secretsCache.secrets;
        } else {
          return [];
        }
      }
    }

    // Filter matching credentials for this domain
    const matched = allSecrets.filter(s => matchesDomain(s.url, s.title, domain));
    return matched;
  }

  async function handleDecryptSecret(secretName: string, tabUrl?: string): Promise<{
    success: boolean;
    username?: string;
    password?: string;
    error?: string;
  }> {
    if (!secretName) {
      return { success: false, error: 'Secret name required' };
    }

    const auth = await getStoredAuthInfo();
    if (!auth || !auth.isConnected || !auth.instanceUrl) {
      return { success: false, error: 'Vault not connected' };
    }

    let detail: any = null;

    // 1. Primary: GET on secrets.get with decrypt=1
    try {
      detail = await makeVaultRequest(auth, 'frappe_vault.api.secrets.get', {
        method: 'GET',
        params: { name: secretName, decrypt: 1 },
      });
    } catch {}

    // 2. Fallback: GET on secrets.decrypt
    if (!detail) {
      try {
        detail = await makeVaultRequest(auth, 'frappe_vault.api.secrets.decrypt', {
          method: 'GET',
          params: { name: secretName },
        });
      } catch {}
    }

    // 3. Fallback: POST on secrets.decrypt
    if (!detail) {
      try {
        detail = await makeVaultRequest(auth, 'frappe_vault.api.secrets.decrypt', {
          method: 'POST',
          body: { name: secretName },
        });
      } catch (err: any) {
        return { success: false, error: err.message || 'Decryption failed' };
      }
    }

    if (!detail) {
      return { success: false, error: 'No data returned from vault' };
    }

    // Origin verification: If triggered from a web page tab, ensure the secret belongs to this domain
    if (tabUrl) {
      try {
        const tabDomain = new URL(tabUrl).hostname;
        const matches = matchesDomain(detail.url, detail.title, tabDomain);
        if (!matches) {
          console.warn('[Frappe Vault] Blocked unauthorized secret access attempt from tab:', tabDomain, detail.url);
          return { success: false, error: 'Security restriction: Secret origin does not match the active web page' };
        }
      } catch {}
    }

    const password =
      detail.decrypted?.password ||
      detail.password ||
      detail.decrypted?.api_secret ||
      detail.api_secret ||
      detail.decrypted?.card_number ||
      detail.card_number ||
      '';

    const username = detail.username || detail.email || '';

    return {
      success: true,
      username,
      password,
    };
  }
});
