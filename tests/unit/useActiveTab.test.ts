import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActiveTab, activeTab } from '../../composables/useActiveTab';
import { mockTabs } from '../setup';

describe('useActiveTab Composable', () => {
  beforeEach(() => {
    activeTab.value = null;
    vi.restoreAllMocks();
  });

  it('detects active tab and extracts root domain', async () => {
    mockTabs.query.mockResolvedValueOnce([
      {
        id: 101,
        url: 'https://subdomain.frappe.cloud/desk#workspace/Vault',
        title: 'Frappe Cloud Workspace',
        favIconUrl: 'https://frappe.cloud/favicon.ico',
      },
    ]);

    const { detectActiveTab } = useActiveTab();
    await detectActiveTab();

    expect(activeTab.value).not.toBeNull();
    expect(activeTab.value?.url).toBe('https://subdomain.frappe.cloud/desk#workspace/Vault');
    expect(activeTab.value?.domain).toBe('frappe.cloud');
    expect(activeTab.value?.title).toBe('Frappe Cloud Workspace');
  });

  it('handles tab without URL or empty tab list', async () => {
    mockTabs.query.mockResolvedValueOnce([]);

    const { detectActiveTab } = useActiveTab();
    await detectActiveTab();

    expect(activeTab.value).toBeNull();
  });

  it('sends AUTOFILL_CREDENTIALS message to active tab id', async () => {
    mockTabs.query.mockResolvedValueOnce([
      {
        id: 202,
        url: 'https://github.com/login',
      },
    ]);
    mockTabs.sendMessage.mockResolvedValueOnce({ success: true });

    const { autofillCredentials } = useActiveTab();
    const result = await autofillCredentials('octocat', 'CorrectHorseBatteryStaple');

    expect(result).toBe(true);
    expect(mockTabs.sendMessage).toHaveBeenCalledWith(202, {
      type: 'AUTOFILL_CREDENTIALS',
      payload: {
        username: 'octocat',
        password: 'CorrectHorseBatteryStaple',
      },
    });
  });

  it('handles autofill message errors gracefully', async () => {
    mockTabs.query.mockResolvedValueOnce([
      {
        id: 303,
        url: 'https://github.com/login',
      },
    ]);
    mockTabs.sendMessage.mockRejectedValueOnce(new Error('Tab closed'));

    const { autofillCredentials } = useActiveTab();
    const result = await autofillCredentials('user', 'pass');

    expect(result).toBe(false);
  });
});
