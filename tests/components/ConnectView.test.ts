import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ConnectView from '../../components/ConnectView.vue';
import { authError, isAuthLoading } from '../../composables/useVaultAuth';
import { setStoredConnectDraft } from '../../utils/storage';

describe('ConnectView Component', () => {
  beforeEach(() => {
    authError.value = null;
    isAuthLoading.value = false;
  });

  it('renders branding and connect button', () => {
    const wrapper = mount(ConnectView, {
      global: {
        stubs: {
          VaultIcon: true,
        },
      },
    });

    expect(wrapper.text()).toContain('Frappe Vault');
    expect(wrapper.text()).toContain('Connect to your hosted vault instance');
    expect(wrapper.text()).toContain('Connect to Vault');
  });

  it('displays authError alert when error occurs', async () => {
    authError.value = 'Invalid API Key or Secret';

    const wrapper = mount(ConnectView, {
      global: {
        stubs: {
          VaultIcon: true,
        },
      },
    });

    expect(wrapper.text()).toContain('Invalid API Key or Secret');
  });

  it('populates fields from stored connect draft on mount', async () => {
    await setStoredConnectDraft({
      instanceUrl: 'https://test.example.com',
      authMode: 'password',
      username: 'testuser@example.com',
    });

    const wrapper = mount(ConnectView, {
      global: {
        stubs: {
          VaultIcon: true,
        },
      },
    });

    await new Promise((r) => setTimeout(r, 10));
    expect(wrapper.html()).toContain('https://test.example.com');
    expect(wrapper.html()).toContain('testuser@example.com');
  });
});
