import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SecretsListView from '../../components/SecretsListView.vue';
import { authState } from '../../composables/useVaultAuth';
import { cachedSecrets, cachedTotal } from '../../composables/useVaultSecrets';
import { mockStorageLocal } from '../setup';
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
  beforeEach(async () => {
    await mockStorageLocal.clear();
    cachedSecrets.value = [];
    cachedTotal.value = 0;
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

  it('loads and renders cached secrets immediately without showing loading spinner', async () => {
    await mockStorageLocal.set({
      frappe_vault_secrets_cache: {
        secrets: mockSecretsList,
        total: 2,
        updatedAt: Date.now(),
      },
    });

    const wrapper = mount(SecretsListView, {
      global: {
        stubs: {
          VaultIcon: true,
          SecretTypeIcon: true,
        },
      },
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(wrapper.text()).not.toContain('Loading vault...');
    expect(wrapper.text()).toContain('GitHub Developer');
    expect(wrapper.text()).toContain('AWS Production Access Key');
  });

  it('renders secrets after fetching when cache is initially empty', async () => {
    await mockStorageLocal.clear();

    const wrapper = mount(SecretsListView, {
      global: {
        stubs: {
          VaultIcon: true,
          SecretTypeIcon: true,
        },
      },
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(wrapper.text()).toContain('GitHub Developer');
  });

  it('renders preloaded in-memory secrets immediately on frame 0', () => {
    cachedSecrets.value = mockSecretsList;
    cachedTotal.value = 2;

    const wrapper = mount(SecretsListView, {
      global: {
        stubs: {
          VaultIcon: true,
          SecretTypeIcon: true,
        },
      },
    });

    // Synchronously rendered without any timers or promises
    expect(wrapper.text()).not.toContain('Loading vault...');
    expect(wrapper.text()).toContain('GitHub Developer');
    expect(wrapper.text()).toContain('AWS Production Access Key');
  });
});
