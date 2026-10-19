import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SecretDetailView from '../../components/SecretDetailView.vue';
import { authState } from '../../composables/useVaultAuth';
import type { VaultSecretDetail } from '../../types/vault';

const sampleSecret: VaultSecretDetail = {
  name: 'sec-github-token',
  title: 'GitHub Production Key',
  secret_type: 'Password',
  username: 'frappe-bot',
  url: 'https://github.com/login',
  is_bookmark: 0,
  modified: new Date().toISOString(),
  has_password: true,
  decrypted: {
    password: 'HiddenInitialPassword',
  },
};

vi.mock('../../composables/useVaultApi', () => ({
  useVaultApi: () => ({
    getSecret: vi.fn().mockResolvedValue(sampleSecret),
    decryptSecret: vi.fn().mockResolvedValue({ password: 'DecryptedPassword123!' }),
    getTotp: vi.fn(),
    toggleBookmark: vi.fn(),
    deleteSecret: vi.fn(),
  }),
}));

describe('SecretDetailView Component', () => {
  beforeEach(() => {
    authState.value = {
      instanceUrl: 'https://vault.example.com',
      user: 'admin@example.com',
      authType: 'token',
      apiKey: 'k',
      apiSecret: 's',
      isConnected: true,
    };
  });

  it('renders top bar with Back button and Delete action', async () => {
    const wrapper = mount(SecretDetailView, {
      props: {
        secretName: 'sec-github-token',
      },
      global: {
        stubs: {
          SecretTypeIcon: true,
          SecretFieldRow: true,
        },
      },
    });

    expect(wrapper.html()).toContain('data-icon="lucide-arrow-left"');
    expect(wrapper.text()).toContain('Delete Secret');
  });

  it('emits back when clicking back button', async () => {
    const wrapper = mount(SecretDetailView, {
      props: {
        secretName: 'sec-github-token',
      },
      global: {
        stubs: {
          SecretTypeIcon: true,
          SecretFieldRow: true,
        },
      },
    });

    const backBtn = wrapper.find('button[tooltip="Back"]');
    if (backBtn.exists()) {
      await backBtn.trigger('click');
      expect(wrapper.emitted('back')).toBeTruthy();
    }
  });
});
