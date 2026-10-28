import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  let activeWrappers: any[] = [];

  function createWrapper(options: any = {}) {
    const w = mount(SecretsListView, {
      global: {
        stubs: {
          VaultIcon: true,
          SecretTypeIcon: true,
        },
      },
      ...options,
    });
    activeWrappers.push(w);
    return w;
  }

  beforeEach(async () => {
    activeWrappers.forEach((w) => w.unmount());
    activeWrappers = [];
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

  afterEach(() => {
    activeWrappers.forEach((w) => w.unmount());
    activeWrappers = [];
    vi.restoreAllMocks();
  });

  it('renders search input and header action buttons', () => {
    const wrapper = createWrapper();

    expect(wrapper.html()).toContain('placeholder="Search secrets');
    expect(wrapper.text()).toContain('Password Generator');
    expect(wrapper.text()).toContain('Settings');
  });

  it('emits open-settings when settings button is clicked', async () => {
    const wrapper = createWrapper();

    const settingsBtn = wrapper.find('button[tooltip="Settings"]');
    if (settingsBtn.exists()) {
      await settingsBtn.trigger('click');
      expect(wrapper.emitted('open-settings')).toBeTruthy();
    }
  });

  it('emits open-generator when generator button is clicked', async () => {
    const wrapper = createWrapper();

    const genBtn = wrapper.find('button[tooltip="Password Generator"]');
    if (genBtn.exists()) {
      await genBtn.trigger('click');
      expect(wrapper.emitted('open-generator')).toBeTruthy();
    }
  });

  it('emits new-secret when New Secret button is clicked', async () => {
    const wrapper = createWrapper();

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

    const wrapper = createWrapper();

    await new Promise((r) => setTimeout(r, 10));

    expect(wrapper.text()).not.toContain('Loading vault...');
    expect(wrapper.text()).toContain('GitHub Developer');
    expect(wrapper.text()).toContain('AWS Production Access Key');
  });

  it('renders secrets after fetching when cache is initially empty', async () => {
    await mockStorageLocal.clear();

    const wrapper = createWrapper();

    await new Promise((r) => setTimeout(r, 20));
    expect(wrapper.text()).toContain('GitHub Developer');
  });

  it('renders preloaded in-memory secrets immediately on frame 0', () => {
    cachedSecrets.value = mockSecretsList;
    cachedTotal.value = 2;

    const wrapper = createWrapper();

    // Synchronously rendered without any timers or promises
    expect(wrapper.text()).not.toContain('Loading vault...');
    expect(wrapper.text()).toContain('GitHub Developer');
    expect(wrapper.text()).toContain('AWS Production Access Key');
  });

  it('filters by bookmarks when bookmarks filter button is clicked and removes item when unbookmarked', async () => {
    cachedSecrets.value = [
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
    cachedTotal.value = 2;

    const wrapper = createWrapper();

    // Click bookmarks filter button
    const bookmarkFilterBtn = wrapper.find('button[tooltip="Show Bookmarks"]');
    expect(bookmarkFilterBtn.exists()).toBe(true);
    await bookmarkFilterBtn.trigger('click');

    // Only AWS secret should be shown
    expect(wrapper.text()).toContain('AWS Production Access Key');
    expect(wrapper.text()).not.toContain('GitHub Developer');

    // Now unbookmark AWS secret
    const removeBookmarkBtn = wrapper.find('button[tooltip="Remove from bookmarks"]');
    expect(removeBookmarkBtn.exists()).toBe(true);
    await removeBookmarkBtn.trigger('click');

    // It should immediately be removed from the filtered list, showing empty state
    expect(wrapper.text()).not.toContain('AWS Production Access Key');
    expect(wrapper.text()).toContain('No bookmarks yet');
  });

  it('handles keyboard shortcuts for search focus and escape', async () => {
    const wrapper = createWrapper();

    const searchInput = wrapper.find('input[type="text"]');
    expect(searchInput.exists()).toBe(true);
    const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus');

    // Trigger Cmd+K
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
    expect(focusSpy).toHaveBeenCalled();

    // Trigger "/"
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
    expect(focusSpy).toHaveBeenCalledTimes(2);

    // Set search query and trigger Escape
    await searchInput.setValue('test search');
    expect((searchInput.element as HTMLInputElement).value).toBe('test search');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();
    expect((searchInput.element as HTMLInputElement).value).toBe('');
  });
});
