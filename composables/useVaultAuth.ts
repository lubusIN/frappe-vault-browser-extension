import { ref } from 'vue';
import type { AuthInfo } from '../types/vault';
import { getStoredAuthInfo, setStoredAuthInfo, clearStoredAuthInfo } from '../utils/storage';

export const authState = ref<AuthInfo | null>(null);
export const isAuthLoading = ref(true);
export const authError = ref<string | null>(null);

function normalizeUrl(url: string): string {
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/+$/, '');
}

export function useVaultAuth() {
  async function initAuth() {
    isAuthLoading.value = true;
    authError.value = null;
    try {
      const stored = await getStoredAuthInfo();
      if (stored) {
        authState.value = stored;
        // Verify session in background
        verifySession(stored);
      } else {
        authState.value = null;
      }
    } catch (err: any) {
      console.error('Failed to init auth:', err);
    } finally {
      isAuthLoading.value = false;
    }
  }

  async function verifySession(info: AuthInfo): Promise<boolean> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (info.authType === 'token' && info.apiKey && info.apiSecret) {
        headers['Authorization'] = `token ${info.apiKey}:${info.apiSecret}`;
      }

      const res = await fetch(`${info.instanceUrl}/api/method/frappe.auth.get_logged_user`, {
        method: 'GET',
        headers,
        credentials: info.authType === 'password' ? 'include' : 'same-origin',
      });

      if (!res.ok) {
        // If unauthorized or error
        if (res.status === 401 || res.status === 403) {
          authError.value = 'Session expired. Please sign in again.';
          authState.value = null;
          await clearStoredAuthInfo();
          return false;
        }
        return false;
      }

      const data = await res.json();
      if (data.message && data.message !== 'Guest') {
        authState.value = {
          ...info,
          user: data.message,
          isConnected: true,
        };
        await setStoredAuthInfo(authState.value);
        return true;
      } else {
        authState.value = null;
        await clearStoredAuthInfo();
        return false;
      }
    } catch (err) {
      console.warn('Verify session network issue:', err);
      return false;
    }
  }

  async function loginWithPassword(rawUrl: string, usr: string, pwd: string): Promise<boolean> {
    isAuthLoading.value = true;
    authError.value = null;

    const instanceUrl = normalizeUrl(rawUrl);

    try {
      const body = new URLSearchParams();
      body.append('usr', usr.trim());
      body.append('pwd', pwd);

      const res = await fetch(`${instanceUrl}/api/method/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
        credentials: 'include',
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = data?.message || data?._server_messages || 'Invalid username or password';
        let parsed = errorMsg;
        try {
          if (typeof errorMsg === 'string' && errorMsg.startsWith('[')) {
            const parsedArr = JSON.parse(errorMsg);
            const inner = JSON.parse(parsedArr[0]);
            parsed = inner.message || errorMsg;
          }
        } catch {}
        authError.value = typeof parsed === 'string' ? parsed : 'Authentication failed';
        return false;
      }

      // Check logged in user
      const userRes = await fetch(`${instanceUrl}/api/method/frappe.auth.get_logged_user`, {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      const userData = await userRes.json();
      const currentUser = userData.message || usr;

      const newAuthInfo: AuthInfo = {
        instanceUrl,
        authType: 'password',
        user: currentUser,
        fullName: data?.full_name || currentUser,
        isConnected: true,
      };

      authState.value = newAuthInfo;
      await setStoredAuthInfo(newAuthInfo);
      return true;
    } catch (err: any) {
      console.error('Login error:', err);
      authError.value =
        err.message || 'Unable to connect to Frappe Vault instance. Please check the URL.';
      return false;
    } finally {
      isAuthLoading.value = false;
    }
  }

  async function loginWithToken(
    rawUrl: string,
    apiKey: string,
    apiSecret: string
  ): Promise<boolean> {
    isAuthLoading.value = true;
    authError.value = null;

    const instanceUrl = normalizeUrl(rawUrl);

    try {
      const headers = {
        Accept: 'application/json',
        Authorization: `token ${apiKey.trim()}:${apiSecret.trim()}`,
      };

      const userRes = await fetch(`${instanceUrl}/api/method/frappe.auth.get_logged_user`, {
        headers,
      });

      if (!userRes.ok) {
        authError.value = 'Invalid API Key or Secret, or insufficient permissions.';
        return false;
      }

      const userData = await userRes.json();
      const currentUser = userData.message;

      if (!currentUser || currentUser === 'Guest') {
        authError.value = 'Authentication returned Guest user. Check API credentials.';
        return false;
      }

      const newAuthInfo: AuthInfo = {
        instanceUrl,
        authType: 'token',
        user: currentUser,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        isConnected: true,
      };

      authState.value = newAuthInfo;
      await setStoredAuthInfo(newAuthInfo);
      return true;
    } catch (err: any) {
      console.error('Token login error:', err);
      authError.value = err.message || 'Unable to connect to Frappe Vault instance.';
      return false;
    } finally {
      isAuthLoading.value = false;
    }
  }

  async function logout() {
    isAuthLoading.value = true;
    try {
      if (authState.value) {
        if (authState.value.authType === 'password') {
          await fetch(`${authState.value.instanceUrl}/api/method/logout`, {
            method: 'POST',
            credentials: 'include',
          }).catch(() => {});
        }
      }
    } catch {}

    authState.value = null;
    authError.value = null;
    await clearStoredAuthInfo();
    isAuthLoading.value = false;
  }

  return {
    authState,
    isAuthLoading,
    authError,
    initAuth,
    loginWithPassword,
    loginWithToken,
    logout,
  };
}
