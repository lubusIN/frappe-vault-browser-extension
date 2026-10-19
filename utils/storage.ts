import type { AuthInfo } from '../types/vault';

const STORAGE_KEYS = {
  AUTH_INFO: 'frappe_vault_auth_info',
  SETTINGS: 'frappe_vault_settings',
} as const;

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
