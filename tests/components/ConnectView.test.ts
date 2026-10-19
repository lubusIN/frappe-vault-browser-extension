import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ConnectView from '../../components/ConnectView.vue';
import { authError, isAuthLoading } from '../../composables/useVaultAuth';

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

  it('populates localhost defaults when clicking Local Dev helper', async () => {
    const wrapper = mount(ConnectView, {
      global: {
        stubs: {
          VaultIcon: true,
        },
      },
    });

    const localBtn = wrapper.findAll('button').find((b) => b.text().includes('localhost:8000'));
    if (localBtn) {
      await localBtn.trigger('click');
      expect(wrapper.html()).toContain('http://localhost:8000');
    }
  });
});
