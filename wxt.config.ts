import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: ({ manifestVersion }) => {
    const isV2 = manifestVersion === 2;
    return {
      name: 'Frappe Vault',
      description:
        'Browser extension for Frappe Vault to securely access and manage secrets & passwords',
      permissions: ['storage', 'activeTab', 'clipboardWrite', 'tabs', 'cookies'],
      host_permissions: ['<all_urls>'],
      action: {
        default_title: 'Frappe Vault',
      },
      commands: {
        [isV2 ? '_execute_browser_action' : '_execute_action']: {
          suggested_key: {
            default: 'Ctrl+Shift+Y',
            mac: 'Command+Shift+Y',
          },
          description: 'Open Frappe Vault',
        },
        autofill_active_tab: {
          suggested_key: {
            default: 'Ctrl+Shift+L',
            mac: 'Command+Shift+L',
          },
          description: 'Auto-fill credentials for the current page',
        },
      },
    };
  },
});
