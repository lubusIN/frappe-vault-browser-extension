import { ref, onMounted } from 'vue';
import type { ActiveTabInfo } from '../types/vault';
import { extractDomain } from '../utils/helpers';

export const activeTab = ref<ActiveTabInfo | null>(null);

export function useActiveTab() {
  async function detectActiveTab() {
    try {
      if (typeof browser !== 'undefined' && browser.tabs) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const current = tabs[0];
        if (current && current.url) {
          const { rootDomain } = extractDomain(current.url);
          activeTab.value = {
            url: current.url,
            title: current.title || '',
            domain: rootDomain,
            favIconUrl: current.favIconUrl,
          };
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to detect active tab:', err);
    }
    activeTab.value = null;
  }

  async function autofillCredentials(username?: string, password?: string): Promise<boolean> {
    try {
      if (typeof browser !== 'undefined' && browser.tabs) {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const current = tabs[0];
        if (current && current.id) {
          const response = await browser.tabs.sendMessage(current.id, {
            type: 'AUTOFILL_CREDENTIALS',
            payload: { username, password },
          });
          return !!response?.success;
        }
      }
    } catch (err) {
      console.warn('Autofill message error:', err);
    }
    return false;
  }

  onMounted(() => {
    if (!activeTab.value) {
      detectActiveTab();
    }
  });

  return {
    activeTab,
    detectActiveTab,
    autofillCredentials,
  };
}
