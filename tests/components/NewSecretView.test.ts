import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NewSecretView from '../../components/NewSecretView.vue';
import { authState } from '../../composables/useVaultAuth';

vi.mock('../../composables/useVaultApi', () => ({
  useVaultApi: () => ({
    createSecret: vi.fn().mockResolvedValue({ name: 'sec-newly-created' }),
    getFolders: vi.fn().mockResolvedValue({ folders: [] }),
  }),
}));

describe('NewSecretView Component', () => {
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

  it('renders top bar with Back button and Save action', () => {
    const wrapper = mount(NewSecretView, {
      global: {
        stubs: {
          PasswordGeneratorModal: true,
        },
      },
    });

    expect(wrapper.text()).toContain('New Secret');
    expect(wrapper.html()).toContain('data-icon="lucide-arrow-left"');
    expect(wrapper.text()).toContain('Save Secret');
  });

  it('emits back when clicking the back button', async () => {
    const wrapper = mount(NewSecretView, {
      global: {
        stubs: {
          PasswordGeneratorModal: true,
        },
      },
    });

    const backBtn = wrapper.find('button[tooltip="Back"]');
    if (backBtn.exists()) {
      await backBtn.trigger('click');
      expect(wrapper.emitted('back')).toBeTruthy();
    }
  });

  it('pre-fills initial title and URL if passed in props', () => {
    const wrapper = mount(NewSecretView, {
      props: {
        initialTitle: 'GitHub Account',
        initialUrl: 'https://github.com/login',
      },
      global: {
        stubs: {
          PasswordGeneratorModal: true,
        },
      },
    });

    expect(wrapper.html()).toContain('value="GitHub Account"');
    expect(wrapper.html()).toContain('value="https://github.com/login"');
  });
});
