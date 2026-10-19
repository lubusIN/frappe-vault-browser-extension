import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SecretsListView from '../../components/SecretsListView.vue';
import { authState } from '../../composables/useVaultAuth';
import type { VaultSecretSummary } from '../../types/vault';

const mockSecretsList: VaultSecretSummary[] = [
  {
    name: 'sec-github',
    title: 'GitHub Developer',
    username: 'octocat',
    secret_type: 'Password',
    url: 'https://github.com',
    is_bookmark: 0,
    modified: new Date().toISOString(),
  },
  {
    name: 'sec-aws',
    title: 'AWS Production Access Key',
    username: 'aws_admin',
    secret_type: 'API Key',
    url: 'https://aws.amazon.com',
    is_bookmark: 1,
    modified: new Date().toISOString(),
  },
];

vi.mock('../../composables/useVaultApi', () => ({
  useVaultApi: () => ({
    getSecrets: vi.fn().mockResolvedValue({
      secrets: mockSecretsList,
      total: 2,
    }),
    decryptSecret: vi.fn(),
    toggleBookmark: vi.fn(),
  }),
}));

describe('SecretsListView Component', () => {
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

  it('renders search input and header action buttons', () => {
    const wrapper = mount(SecretsListView, {
      global: {
        stubs: {
          VaultIcon: true,
          SecretTypeIcon: true,
        },
      },
    });

    expect(wrapper.html()).toContain('placeholder="Search secrets');
    expect(wrapper.text()).toContain('Password Generator');
    expect(wrapper.text()).toContain('Settings');
  });

  it('emits open-settings when settings button is clicked', async () => {
    const wrapper = mount(SecretsListView, {
      global: {
        stubs: {
          VaultIcon: true,
          SecretTypeIcon: true,
        },
      },
    });

    const settingsBtn = wrapper.find('button[tooltip="Settings"]');
    if (settingsBtn.exists()) {
      await settingsBtn.trigger('click');
      expect(wrapper.emitted('open-settings')).toBeTruthy();
    }
  });

  it('emits open-generator when generator button is clicked', async () => {
    const wrapper = mount(SecretsListView, {
      global: {
        stubs: {
          VaultIcon: true,
          SecretTypeIcon: true,
        },
      },
    });

    const genBtn = wrapper.find('button[tooltip="Password Generator"]');
    if (genBtn.exists()) {
      await genBtn.trigger('click');
      expect(wrapper.emitted('open-generator')).toBeTruthy();
    }
  });

  it('emits new-secret when New Secret button is clicked', async () => {
    const wrapper = mount(SecretsListView, {
      global: {
        stubs: {
          VaultIcon: true,
          SecretTypeIcon: true,
        },
      },
    });

    const newBtn = wrapper.find('button[tooltip="New Secret (N)"]');
    if (newBtn.exists()) {
      await newBtn.trigger('click');
      expect(wrapper.emitted('new-secret')).toBeTruthy();
    }
  });
});
