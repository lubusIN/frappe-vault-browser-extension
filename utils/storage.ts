import type { AuthInfo, VaultSecretSummary } from '../types/vault';

const STORAGE_KEYS = {
  AUTH_INFO: 'frappe_vault_auth_info',
  SETTINGS: 'frappe_vault_settings',
  CONNECT_DRAFT: 'frappe_vault_connect_draft',
  SECRETS_CACHE: 'frappe_vault_secrets_cache',
} as const;

export interface CachedSecretsData {
  secrets: VaultSecretSummary[];
  total: number;
  updatedAt: number;
}

export interface ConnectDraft {
  instanceUrl?: string;
  authMode?: 'password' | 'token';
  username?: string;
  apiKey?: string;
}

export interface ExtensionSettings {
  autoFillCurrentTab: boolean;
  clearClipboardAfterSeconds: number;
  theme: 'system' | 'light' | 'dark';
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  autoFillCurrentTab: true,
  clearClipboardAfterSeconds: 30,
  theme: 'system',
};

export async function getStoredAuthInfo(): Promise<AuthInfo | null> {
  try {
    const res = await browser.storage.local.get(STORAGE_KEYS.AUTH_INFO);
    const data = res[STORAGE_KEYS.AUTH_INFO] as Partial<AuthInfo> | undefined;
    if (data && data.instanceUrl && data.isConnected) {
      return data as AuthInfo;
    }
  } catch (err) {
    console.error('Failed to get auth info from storage:', err);
  }
  return null;
}

export async function setStoredAuthInfo(authInfo: AuthInfo): Promise<void> {
  try {
    await browser.storage.local.set({
      [STORAGE_KEYS.AUTH_INFO]: authInfo,
    });
  } catch (err) {
    console.error('Failed to set auth info in storage:', err);
  }
}

export async function clearStoredAuthInfo(): Promise<void> {
  try {
    await browser.storage.local.remove(STORAGE_KEYS.AUTH_INFO);
  } catch (err) {
    console.error('Failed to clear auth info from storage:', err);
  }
}

export async function getStoredSettings(): Promise<ExtensionSettings> {
  try {
    const res = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
    const data = res[STORAGE_KEYS.SETTINGS] as Partial<ExtensionSettings> | undefined;
    if (data) {
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (err) {
    console.error('Failed to get settings from storage:', err);
  }
  return DEFAULT_SETTINGS;
}

export async function setStoredSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  try {
    const current = await getStoredSettings();
    await browser.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: { ...current, ...settings },
    });
  } catch (err) {
    console.error('Failed to update settings in storage:', err);
  }
}

export async function getStoredConnectDraft(): Promise<ConnectDraft | null> {
  try {
    const res = await browser.storage.local.get(STORAGE_KEYS.CONNECT_DRAFT);
    const data = res[STORAGE_KEYS.CONNECT_DRAFT] as ConnectDraft | undefined;
    return data || null;
  } catch (err) {
    console.error('Failed to get connect draft from storage:', err);
    return null;
  }
}

export async function setStoredConnectDraft(draft: ConnectDraft): Promise<void> {
  try {
    await browser.storage.local.set({
      [STORAGE_KEYS.CONNECT_DRAFT]: draft,
    });
  } catch (err) {
    console.error('Failed to save connect draft to storage:', err);
  }
}

export async function getStoredSecretsCache(): Promise<CachedSecretsData | null> {
  try {
    const res = await browser.storage.local.get(STORAGE_KEYS.SECRETS_CACHE);
    const data = res[STORAGE_KEYS.SECRETS_CACHE] as CachedSecretsData | undefined;
    if (data && Array.isArray(data.secrets)) {
      return data;
    }
  } catch (err) {
    console.error('Failed to get secrets cache from storage:', err);
  }
  return null;
}

export async function setStoredSecretsCache(cache: CachedSecretsData): Promise<void> {
  try {
    await browser.storage.local.set({
      [STORAGE_KEYS.SECRETS_CACHE]: cache,
    });
  } catch (err) {
    console.error('Failed to save secrets cache to storage:', err);
  }
}

export async function clearStoredSecretsCache(): Promise<void> {
  try {
    await browser.storage.local.remove(STORAGE_KEYS.SECRETS_CACHE);
  } catch (err) {
    console.error('Failed to clear secrets cache from storage:', err);
  }
}
