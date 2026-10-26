import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'Frappe Vault',
    description:
      'Browser extension for Frappe Vault to securely access and manage secrets & passwords',
    permissions: ['storage', 'activeTab', 'clipboardWrite', 'tabs', 'cookies'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Frappe Vault',
    },
  },
});
