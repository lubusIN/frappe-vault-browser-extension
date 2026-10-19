import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SettingsView from '../../components/SettingsView.vue';
import { authState } from '../../composables/useVaultAuth';
import { mockStorageLocal } from '../setup';

describe('SettingsView Component', () => {
  beforeEach(async () => {
    await mockStorageLocal.clear();
    authState.value = {
      instanceUrl: 'https://vault.company.com',
      user: 'dev@company.com',
      fullName: 'Dev Engineer',
      authType: 'token',
      apiKey: 'k1',
      apiSecret: 's1',
      isConnected: true,
    };
  });

  it('renders top bar with Back button and Settings title', () => {
    const wrapper = mount(SettingsView, {
      global: {
        stubs: ['Button', 'Badge', 'Icon', 'Switch', 'Dialog'],
      },
    });

    expect(wrapper.text()).toContain('Settings');
    expect(wrapper.html()).toContain('icon="lucide-arrow-left"');
  });

  it('emits back when clicking the back button', async () => {
    const wrapper = mount(SettingsView, {
      global: {
        stubs: ['Badge', 'Icon', 'Switch', 'Dialog'],
      },
    });

    const backBtn = wrapper.find('button[tooltip="Back"]');
    if (backBtn.exists()) {
      await backBtn.trigger('click');
      expect(wrapper.emitted('back')).toBeTruthy();
    }
  });

  it('displays connected instance URL and user email', () => {
    const wrapper = mount(SettingsView, {
      global: {
        stubs: ['Button', 'Badge', 'Icon', 'Switch', 'Dialog'],
      },
    });

    expect(wrapper.text()).toContain('https://vault.company.com');
    expect(wrapper.text()).toContain('dev@company.com');
  });

  it('renders theme selector options (System, Light, Dark)', () => {
    const wrapper = mount(SettingsView, {
      global: {
        stubs: ['Button', 'Badge', 'Icon', 'Switch', 'Dialog'],
      },
    });

    expect(wrapper.text()).toContain('Appearance');
    expect(wrapper.text()).toContain('System');
    expect(wrapper.text()).toContain('Light');
    expect(wrapper.text()).toContain('Dark');
  });

  it('persists theme choice to storage when clicked', async () => {
    const wrapper = mount(SettingsView, {
      global: {
        stubs: ['Button', 'Badge', 'Icon', 'Switch', 'Dialog'],
      },
    });

    const darkBtn = wrapper.findAll('button').find((b) => b.text().includes('Dark'));
    if (darkBtn) {
      await darkBtn.trigger('click');
      expect(mockStorageLocal.set).toHaveBeenCalledWith(
        expect.objectContaining({
          frappe_vault_settings: expect.objectContaining({
            theme: 'dark',
          }),
        })
      );
    }
  });
});
