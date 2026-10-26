import { createApp } from 'vue';
import { FrappeUI, useColorScheme } from 'frappe-ui';
import App from './App.vue';
import './style.css';

import { getStoredSettings, getStoredAuthInfo, getStoredSecretsCache } from '../../utils/storage';
import { authState, isAuthInitializing, useVaultAuth } from '../../composables/useVaultAuth';
import {
  cachedSecrets,
  cachedTotal,
  isSecretsCacheLoaded,
} from '../../composables/useVaultSecrets';

// Initialize Frappe UI color scheme (system/light/dark)
const { setColorScheme } = useColorScheme();

// Preload storage data in parallel before mounting to ensure 0ms instant display
const [settings, auth, secretsCache] = await Promise.all([
  getStoredSettings(),
  getStoredAuthInfo(),
  getStoredSecretsCache(),
]);

if (settings.theme) {
  setColorScheme(settings.theme);
}

if (auth) {
  authState.value = auth;
  // Verify session silently in background without blocking mount
  useVaultAuth().verifySession(auth);
}
isAuthInitializing.value = false;

if (secretsCache && Array.isArray(secretsCache.secrets)) {
  cachedSecrets.value = secretsCache.secrets;
  cachedTotal.value = secretsCache.total ?? secretsCache.secrets.length;
  isSecretsCacheLoaded.value = true;
}

const app = createApp(App);
app.use(FrappeUI as any, { socketio: false });
app.mount('#app');
