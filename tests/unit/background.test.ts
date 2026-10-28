import { describe, it, expect, beforeEach, vi } from 'vitest';
import backgroundInit, { clearSecretsCache } from '../../entrypoints/background';
import { setStoredAuthInfo, setStoredSettings } from '../../utils/storage';
import { mockCommands, mockTabs, mockAction, mockStorageLocal } from '../setup';

describe('Background Script - Global Shortcuts & Autofill', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    clearSecretsCache();
    await mockStorageLocal.clear();
    mockCommands.onCommand.addListener.mockClear();
    mockTabs.sendMessage.mockReset();
    mockTabs.query.mockReset();
    mockAction.setBadgeText.mockReset();
  });

  it('registers onCommand listener for global shortcuts', () => {
    backgroundInit();
    expect(mockCommands.onCommand.addListener).toHaveBeenCalled();
  });

  it('executes autofill on active tab when autofill_active_tab command is triggered', async () => {
    await setStoredAuthInfo({
      instanceUrl: 'https://vault.example.com',
      user: 'user@example.com',
      authType: 'token',
      apiKey: 'key',
      apiSecret: 'secret',
      isConnected: true,
    });
    await setStoredSettings({
      autoFillCurrentTab: true,
    });

    mockTabs.query.mockResolvedValue([
      {
        id: 42,
        url: 'https://github.com/login',
      },
    ]);

    const mockFetch = vi.fn(async (url: string) => {
      if (url.includes('frappe_vault.api.secrets.list')) {
        return {
          ok: true,
          json: async () => ({
            message: {
              secrets: [
                {
                  name: 'sec-1',
                  title: 'GitHub Personal',
                  url: 'https://github.com',
                  username: 'octocat',
                  secret_type: 'Password',
                },
              ],
              total: 1,
            },
          }),
        };
      }
      if (url.includes('frappe_vault.api.secrets.get')) {
        return {
          ok: true,
          json: async () => ({
            message: {
              name: 'sec-1',
              title: 'GitHub Personal',
              url: 'https://github.com',
              username: 'octocat',
              decrypted: {
                password: 'supersecretpassword',
              },
            },
          }),
        };
      }
      return { ok: false };
    });
    // @ts-expect-error Mocking global fetch
    globalThis.fetch = mockFetch;

    let commandCallback: ((cmd: string) => Promise<void>) | null = null;
    mockCommands.onCommand.addListener.mockImplementation((cb) => {
      commandCallback = cb;
    });

    backgroundInit();
    expect(commandCallback).not.toBeNull();

    await commandCallback!('autofill_active_tab');

    expect(mockTabs.sendMessage).toHaveBeenCalledWith(42, {
      type: 'AUTOFILL_CREDENTIALS',
      payload: {
        username: 'octocat',
        password: 'supersecretpassword',
      },
    });

    expect(mockAction.setBadgeText).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '✓',
        tabId: 42,
      })
    );
  });

  it('cycles through multiple matching accounts on repeated shortcut triggers', async () => {
    await setStoredAuthInfo({
      instanceUrl: 'https://vault.example.com',
      user: 'user@example.com',
      authType: 'token',
      apiKey: 'key',
      apiSecret: 'secret',
      isConnected: true,
    });

    mockTabs.query.mockResolvedValue([
      {
        id: 99,
        url: 'https://github.com/login',
      },
    ]);

    const mockFetch = vi.fn(async (url: string) => {
      if (url.includes('frappe_vault.api.secrets.list')) {
        return {
          ok: true,
          json: async () => ({
            message: {
              secrets: [
                {
                  name: 'sec-work',
                  title: 'GitHub Work',
                  url: 'https://github.com',
                  username: 'work_octo',
                },
                {
                  name: 'sec-personal',
                  title: 'GitHub Personal',
                  url: 'https://github.com',
                  username: 'personal_octo',
                },
              ],
              total: 2,
            },
          }),
        };
      }
      if (url.includes('name=sec-work')) {
        return {
          ok: true,
          json: async () => ({
            message: {
              name: 'sec-work',
              url: 'https://github.com',
              username: 'work_octo',
              decrypted: { password: 'work-pass' },
            },
          }),
        };
      }
      if (url.includes('name=sec-personal')) {
        return {
          ok: true,
          json: async () => ({
            message: {
              name: 'sec-personal',
              url: 'https://github.com',
              username: 'personal_octo',
              decrypted: { password: 'personal-pass' },
            },
          }),
        };
      }
      return { ok: false };
    });
    // @ts-expect-error Mocking global fetch
    globalThis.fetch = mockFetch;

    let commandCallback: ((cmd: string) => Promise<void>) | null = null;
    mockCommands.onCommand.addListener.mockImplementation((cb) => {
      commandCallback = cb;
    });

    backgroundInit();

    // First trigger -> fills work account (1/2)
    await commandCallback!('autofill_active_tab');
    expect(mockTabs.sendMessage).toHaveBeenCalledWith(99, {
      type: 'AUTOFILL_CREDENTIALS',
      payload: {
        username: 'work_octo',
        password: 'work-pass',
      },
    });
    expect(mockAction.setBadgeText).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '1/2',
        tabId: 99,
      })
    );

    // Second trigger -> fills personal account (2/2)
    await commandCallback!('autofill_active_tab');
    expect(mockTabs.sendMessage).toHaveBeenCalledWith(99, {
      type: 'AUTOFILL_CREDENTIALS',
      payload: {
        username: 'personal_octo',
        password: 'personal-pass',
      },
    });
    expect(mockAction.setBadgeText).toHaveBeenCalledWith(
      expect.objectContaining({
        text: '2/2',
        tabId: 99,
      })
    );
  });
});
