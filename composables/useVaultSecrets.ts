import { ref } from 'vue';
import type { VaultSecretSummary } from '../types/vault';
import { getStoredSecretsCache } from '../utils/storage';

export const cachedSecrets = ref<VaultSecretSummary[]>([]);
export const cachedTotal = ref(0);
export const isSecretsCacheLoaded = ref(false);

export async function preloadSecretsCache(): Promise<void> {
  if (isSecretsCacheLoaded.value) return;
  try {
    const cached = await getStoredSecretsCache();
    if (cached && Array.isArray(cached.secrets)) {
      cachedSecrets.value = cached.secrets;
      cachedTotal.value = cached.total ?? cached.secrets.length;
      isSecretsCacheLoaded.value = true;
    }
  } catch (err) {
    console.error('Failed to preload secrets cache:', err);
  }
}

export function useVaultSecrets() {
  return {
    cachedSecrets,
    cachedTotal,
    isSecretsCacheLoaded,
    preloadSecretsCache,
  };
}
