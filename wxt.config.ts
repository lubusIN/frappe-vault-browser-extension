import { defineConfig } from 'wxt';

// See https://wxt.dev/api/reference/wxt/interfaces/inlineconfig.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'Frappe Vault',
    description:
      'Browser extension for Frappe Vault to securely access and manage secrets & passwords',
    version: '1.0.0',
    permissions: ['storage', 'activeTab', 'clipboardWrite', 'tabs', 'scripting'],
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Frappe Vault',
    },
  },
});
