<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useVaultApi } from '../composables/useVaultApi';
import { useVaultAuth } from '../composables/useVaultAuth';
import { useActiveTab } from '../composables/useActiveTab';
import type { VaultSecretSummary } from '../types/vault';
import SecretTypeIcon from './SecretTypeIcon.vue';
import VaultIcon from './VaultIcon.vue';
import BookmarkIcon from './BookmarkIcon.vue';
import { matchesDomain, copyText, openExternalUrl } from '../utils/helpers';
import { getStoredSecretsCache, setStoredSecretsCache } from '../utils/storage';
import { cachedSecrets, cachedTotal } from '../composables/useVaultSecrets';
import { Button, TextInput, Badge, Spinner, Dropdown, Icon, KeyboardShortcut } from 'frappe-ui';
import type { DropdownOptions } from 'frappe-ui';

const emit = defineEmits<{
  (e: 'select', secretName: string): void;
  (e: 'new-secret', initialUrl?: string, initialTitle?: string): void;
  (e: 'open-generator'): void;
  (e: 'open-settings'): void;
  (e: 'open-about'): void;
}>();

const { getSecrets, decryptSecret, toggleBookmark } = useVaultApi();
const { authState } = useVaultAuth();
const { activeTab, autofillCredentials } = useActiveTab();

const PAGE_SIZE = 30;
const secrets = ref<VaultSecretSummary[]>([...cachedSecrets.value]);
const totalSecrets = ref(cachedTotal.value || cachedSecrets.value.length);
const isLoading = ref(cachedSecrets.value.length === 0);
const isRefreshing = ref(false);
const isLoadingMore = ref(false);
const searchQuery = ref('');
const activeTabFilter = ref<'all' | 'bookmarks'>('all');
const selectedType = ref<string>('All');
const serverSearchResults = ref<VaultSecretSummary[] | null>(null);
const isSearchingServer = ref(false);
let searchDebounceTimer: any = null;

const copiedSecretName = ref<string | null>(null);
const autofilledSecretName = ref<string | null>(null);
const searchInputRef = ref<any>(null);
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

const hasMore = computed(() => {
  return secrets.value.length < totalSecrets.value;
});

const remainingCount = computed(() => {
  return Math.max(0, totalSecrets.value - secrets.value.length);
});

function toggleBookmarksFilter() {
  activeTabFilter.value = activeTabFilter.value === 'bookmarks' ? 'all' : 'bookmarks';
}

function clearFilters() {
  selectedType.value = 'All';
  activeTabFilter.value = 'all';
  searchQuery.value = '';
  serverSearchResults.value = null;
}

const typeCounts = computed(() => {
  const counts: Record<string, number> = {
    Password: 0,
    'API Key': 0,
    Note: 0,
    'Credit Card': 0,
    Database: 0,
  };
  for (const s of secrets.value) {
    if (s.secret_type && counts[s.secret_type] !== undefined) {
      counts[s.secret_type]++;
    }
  }
  return counts;
});

function getTypeIcon(type: string): string {
  switch (type) {
    case 'Password':
      return 'lucide-key-round';
    case 'API Key':
      return 'lucide-binary';
    case 'Note':
      return 'lucide-sticky-note';
    case 'Credit Card':
      return 'lucide-credit-card';
    case 'Database':
      return 'lucide-database';
    default:
      return 'lucide-filter';
  }
}

const typeDropdownOptions = computed<DropdownOptions>(() => [
  {
    group: 'Filter by Type',
    hideLabel: false,
    options: [
      {
        label: `All Types (${totalSecrets.value || secrets.value.length})`,
        icon: 'lucide-layers',
        selected: selectedType.value === 'All',
        onClick: () => {
          selectedType.value = 'All';
        },
      },
      {
        label: `Passwords (${typeCounts.value['Password'] || 0})`,
        icon: 'lucide-key-round',
        selected: selectedType.value === 'Password',
        onClick: () => {
          selectedType.value = 'Password';
        },
      },
      {
        label: `API Keys (${typeCounts.value['API Key'] || 0})`,
        icon: 'lucide-binary',
        selected: selectedType.value === 'API Key',
        onClick: () => {
          selectedType.value = 'API Key';
        },
      },
      {
        label: `Notes (${typeCounts.value['Note'] || 0})`,
        icon: 'lucide-sticky-note',
        selected: selectedType.value === 'Note',
        onClick: () => {
          selectedType.value = 'Note';
        },
      },
      {
        label: `Credit Cards (${typeCounts.value['Credit Card'] || 0})`,
        icon: 'lucide-credit-card',
        selected: selectedType.value === 'Credit Card',
        onClick: () => {
          selectedType.value = 'Credit Card';
        },
      },
      {
        label: `Databases (${typeCounts.value['Database'] || 0})`,
        icon: 'lucide-database',
        selected: selectedType.value === 'Database',
        onClick: () => {
          selectedType.value = 'Database';
        },
      },
    ],
  },
]);

async function fetchVaultSecrets(showLoading = false) {
  if (showLoading && secrets.value.length === 0) {
    isLoading.value = true;
  }
  isRefreshing.value = true;
  try {
    const res = await getSecrets({
      limit: PAGE_SIZE,
      offset: 0,
      order_by: 'modified desc',
    });
    secrets.value = res.secrets || [];
    totalSecrets.value = res.total ?? secrets.value.length;
    cachedSecrets.value = secrets.value;
    cachedTotal.value = totalSecrets.value;
    await setStoredSecretsCache({
      secrets: secrets.value,
      total: totalSecrets.value,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Failed to fetch secrets:', err);
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
}

async function handleLoadMore() {
  if (isLoadingMore.value || !hasMore.value) return;
  isLoadingMore.value = true;
  try {
    const res = await getSecrets({
      limit: PAGE_SIZE,
      offset: secrets.value.length,
      order_by: 'modified desc',
    });
    const newItems = res.secrets || [];
    const existingNames = new Set(secrets.value.map((s) => s.name));
    for (const item of newItems) {
      if (!existingNames.has(item.name)) {
        secrets.value.push(item);
      }
    }
    if (res.total !== undefined) {
      totalSecrets.value = res.total;
    }
    cachedSecrets.value = secrets.value;
    cachedTotal.value = totalSecrets.value;
    await setStoredSecretsCache({
      secrets: secrets.value,
      total: totalSecrets.value,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Failed to load more secrets:', err);
  } finally {
    isLoadingMore.value = false;
  }
}

// Watch search query with debounce: if vault has more items than loaded locally, query server
watch(searchQuery, (newVal) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  const q = newVal.trim();
  if (!q) {
    serverSearchResults.value = null;
    return;
  }
  if (totalSecrets.value > secrets.value.length) {
    searchDebounceTimer = setTimeout(async () => {
      isSearchingServer.value = true;
      try {
        const res = await getSecrets({
          search: q,
          limit: 50,
          order_by: 'modified desc',
        });
        serverSearchResults.value = res.secrets || [];
      } catch (err) {
        console.warn('Server search failed, falling back to local filter:', err);
        serverSearchResults.value = null;
      } finally {
        isSearchingServer.value = false;
      }
    }, 250);
  } else {
    serverSearchResults.value = null;
  }
});

// Matching secrets for the active tab domain
const matchingSecrets = computed(() => {
  if (!activeTab.value?.domain) return [];
  return secrets.value.filter((s) => matchesDomain(s.url, s.title, activeTab.value?.domain));
});

// Filtered secrets list (supports both server search results and local filtering)
const filteredSecrets = computed(() => {
  const source = serverSearchResults.value !== null ? serverSearchResults.value : secrets.value;
  return source.filter((s) => {
    // Bookmark filter
    if (activeTabFilter.value === 'bookmarks' && !s.is_bookmark) {
      return false;
    }

    // Type filter
    if (selectedType.value !== 'All' && s.secret_type !== selectedType.value) {
      return false;
    }

    // Search query (when filtered locally)
    if (serverSearchResults.value === null && searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const matchTitle = s.title?.toLowerCase().includes(q);
      const matchUser = s.username?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
      const matchUrl = s.url?.toLowerCase().includes(q);
      return matchTitle || matchUser || matchUrl;
    }

    return true;
  });
});

async function handleQuickCopyPassword(secret: VaultSecretSummary, event: Event) {
  event.stopPropagation();
  try {
    const full = await decryptSecret(secret.name);
    const pwd =
      full.decrypted?.password ||
      (full as any).password ||
      full.decrypted?.api_secret ||
      (full as any).api_secret ||
      full.decrypted?.card_number ||
      (full as any).card_number;
    if (pwd) {
      await copyText(pwd, 30);
      copiedSecretName.value = secret.name;
      setTimeout(() => {
        if (copiedSecretName.value === secret.name) {
          copiedSecretName.value = null;
        }
      }, 2000);
    }
  } catch (err) {
    console.error('Copy password error:', err);
  }
}

async function handleQuickAutofill(secret: VaultSecretSummary, event: Event) {
  event.stopPropagation();
  try {
    const full = await decryptSecret(secret.name);
    const pwd = full.decrypted?.password || (full as any).password || '';
    const ok = await autofillCredentials(secret.username || secret.email || '', pwd);
    if (ok) {
      autofilledSecretName.value = secret.name;
      setTimeout(() => {
        if (autofilledSecretName.value === secret.name) {
          autofilledSecretName.value = null;
        }
      }, 2000);
    }
  } catch (err) {
    console.error('Autofill error:', err);
  }
}

async function handleToggleBookmark(secret: VaultSecretSummary, event?: Event) {
  event?.stopPropagation();
  const previousState = secret.is_bookmark ? 1 : 0;
  const newState = previousState ? 0 : 1;

  // 1. Optimistic update across all references with immutable maps
  secret.is_bookmark = newState;
  secrets.value = secrets.value.map((s) =>
    s.name === secret.name ? { ...s, is_bookmark: newState } : s
  );
  cachedSecrets.value = cachedSecrets.value.map((s) =>
    s.name === secret.name ? { ...s, is_bookmark: newState } : s
  );
  if (serverSearchResults.value) {
    serverSearchResults.value = serverSearchResults.value.map((s) =>
      s.name === secret.name ? { ...s, is_bookmark: newState } : s
    );
  }

  try {
    const res = await toggleBookmark(secret.name);
    const confirmedState =
      res && res.is_bookmark !== undefined ? (res.is_bookmark ? 1 : 0) : newState;
    secret.is_bookmark = confirmedState;
    secrets.value = secrets.value.map((s) =>
      s.name === secret.name ? { ...s, is_bookmark: confirmedState } : s
    );
    cachedSecrets.value = cachedSecrets.value.map((s) =>
      s.name === secret.name ? { ...s, is_bookmark: confirmedState } : s
    );
    if (serverSearchResults.value) {
      serverSearchResults.value = serverSearchResults.value.map((s) =>
        s.name === secret.name ? { ...s, is_bookmark: confirmedState } : s
      );
    }
    await setStoredSecretsCache({
      secrets: secrets.value,
      total: totalSecrets.value,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Failed to toggle bookmark:', err);
    // Revert optimistic update on failure
    secret.is_bookmark = previousState;
    secrets.value = secrets.value.map((s) =>
      s.name === secret.name ? { ...s, is_bookmark: previousState } : s
    );
    cachedSecrets.value = cachedSecrets.value.map((s) =>
      s.name === secret.name ? { ...s, is_bookmark: previousState } : s
    );
    if (serverSearchResults.value) {
      serverSearchResults.value = serverSearchResults.value.map((s) =>
        s.name === secret.name ? { ...s, is_bookmark: previousState } : s
      );
    }
  }
}

function handleOpenFullVault(path: string = '/secrets') {
  if (authState.value?.instanceUrl) {
    openExternalUrl(`${authState.value.instanceUrl}/vault${path}`);
  }
}

function handleAddForCurrentTab() {
  emit('new-secret', activeTab.value?.url, activeTab.value?.title || activeTab.value?.domain);
}

function focusSearchInput() {
  if (!searchInputRef.value) return;
  if (typeof searchInputRef.value.focus === 'function') {
    searchInputRef.value.focus();
  } else if (searchInputRef.value.inputElement) {
    searchInputRef.value.inputElement.focus();
  } else if (searchInputRef.value instanceof HTMLElement) {
    searchInputRef.value.focus();
  } else if (searchInputRef.value.$el instanceof HTMLElement) {
    if (searchInputRef.value.$el.tagName === 'INPUT') {
      searchInputRef.value.$el.focus();
    } else {
      searchInputRef.value.$el.querySelector('input')?.focus();
    }
  }
}

function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  const isInputActive =
    target &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

  // Focus search with Cmd+K / Ctrl+K
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    focusSearchInput();
    return;
  }

  // Focus search with "/" when not in an input
  if (e.key === '/' && !isInputActive) {
    e.preventDefault();
    focusSearchInput();
    return;
  }

  // Create new secret with "N" when not in an input
  if ((e.key === 'n' || e.key === 'N') && !isInputActive && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    emit('new-secret');
    return;
  }

  // Clear search on Escape when focused in search or when searchQuery has text
  if (e.key === 'Escape') {
    if (searchQuery.value) {
      e.preventDefault();
      searchQuery.value = '';
    } else if (isInputActive) {
      (target as HTMLElement).blur();
    }
    return;
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);

  // If we already have preloaded secrets in memory, silent background revalidate
  if (secrets.value.length > 0) {
    fetchVaultSecrets(false);
    return;
  }

  // Otherwise check local storage
  try {
    const cached = await getStoredSecretsCache();
    if (cached && Array.isArray(cached.secrets) && cached.secrets.length > 0) {
      secrets.value = cached.secrets;
      totalSecrets.value = cached.total ?? cached.secrets.length;
      cachedSecrets.value = cached.secrets;
      cachedTotal.value = totalSecrets.value;
      isLoading.value = false;
      // Background revalidation without blocking UI
      fetchVaultSecrets(false);
      return;
    }
  } catch (err) {
    console.warn('Failed to read secrets cache:', err);
  }
  fetchVaultSecrets(true);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="flex flex-col h-full bg-surface-gray-2 text-ink-gray-9">
    <!-- Top Action Header (Espresso Appbar) -->
    <div
      class="px-3.5 py-2.5 bg-surface-base border-b border-outline-gray-2 flex items-center justify-between flex-shrink-0"
    >
      <div class="flex items-center gap-2 min-w-0">
        <VaultIcon size="size-5" class="rounded-md shadow-2xs flex-shrink-0" />
        <span class="text-xs font-bold tracking-tight text-ink-gray-9 truncate">Frappe Vault</span>
      </div>

      <div class="flex items-center gap-1.5 flex-shrink-0">
        <Button
          size="sm"
          variant="ghost"
          icon="lucide-wand-2"
          label="Password Generator"
          tooltip="Password Generator"
          @click="emit('open-generator')"
        />
        <Button
          size="sm"
          variant="solid"
          icon-left="lucide-plus"
          label="New"
          tooltip="New Secret (N)"
          @click="emit('new-secret')"
        />
        <Button
          size="sm"
          variant="ghost"
          icon="lucide-settings"
          label="Settings"
          tooltip="Settings"
          @click="emit('open-settings')"
        />
      </div>
    </div>

    <!-- Search & Single-Row Filter Controls (Option 2) -->
    <div
      class="px-3 py-2 bg-surface-base border-b border-outline-gray-2 flex items-center gap-1.5 flex-shrink-0"
    >
      <!-- Search Input using Frappe UI TextInput -->
      <div class="flex-1 min-w-0">
        <TextInput
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          :placeholder="`Search secrets... (${isMac ? '⌘K' : 'Ctrl+K'})`"
          size="sm"
          variant="subtle"
        >
          <template #prefix>
            <Spinner v-if="isSearchingServer" size="xs" />
            <Icon v-else icon="lucide-search" class="size-3.5 text-ink-gray-4" />
          </template>
          <template #suffix>
            <Button
              v-if="searchQuery"
              size="xs"
              variant="ghost"
              icon="lucide-x"
              label="Clear search"
              tooltip="Clear search"
              @click="searchQuery = ''"
            />
            <KeyboardShortcut v-else combo="Mod+K" bg class="pointer-events-none" />
          </template>
        </TextInput>
      </div>

      <!-- Bookmarks Filter Toggle Button -->
      <Button
        size="sm"
        :variant="activeTabFilter === 'bookmarks' ? 'solid' : 'subtle'"
        :tooltip="activeTabFilter === 'bookmarks' ? 'Show All Items' : 'Show Bookmarks'"
        @click="toggleBookmarksFilter"
      >
        <template #icon>
          <BookmarkIcon
            :filled="activeTabFilter === 'bookmarks'"
            class="size-3.5 transition-colors"
            :class="activeTabFilter === 'bookmarks' ? 'text-amber-500' : 'text-ink-gray-5'"
          />
        </template>
      </Button>

      <!-- Type Filter Dropdown -->
      <Dropdown :options="typeDropdownOptions" align="end">
        <template #default>
          <Button
            size="sm"
            :variant="selectedType === 'All' ? 'subtle' : 'solid'"
            :icon-left="selectedType === 'All' ? 'lucide-filter' : getTypeIcon(selectedType)"
            icon-right="lucide-chevron-down"
            :label="selectedType === 'All' ? 'Type' : selectedType"
            tooltip="Filter by Type"
            class="max-w-[120px]"
          />
        </template>
      </Dropdown>

      <!-- Refresh button -->
      <Button
        size="sm"
        variant="subtle"
        icon="lucide-refresh-cw"
        :loading="isRefreshing || (isLoading && secrets.length === 0)"
        tooltip="Refresh Vault"
        @click="() => fetchVaultSecrets(false)"
      />
    </div>

    <!-- Scrollable Content Area -->
    <div class="flex-1 overflow-y-auto p-3 space-y-3">
      <!-- Active Tab Matching Section -->
      <div
        v-if="
          activeTab?.domain && !searchQuery && activeTabFilter === 'all' && selectedType === 'All'
        "
        class="bg-surface-base border border-outline-gray-2 rounded-4 p-2.5 shadow-elevation-1 space-y-2"
      >
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 font-semibold text-ink-gray-9 min-w-0">
            <Icon icon="lucide-globe" class="size-3.5 text-ink-gray-7 flex-shrink-0" />
            <span class="truncate">{{ activeTab.domain }}</span>
          </div>
          <Badge
            size="sm"
            variant="subtle"
            :theme="matchingSecrets.length > 0 ? 'blue' : 'gray'"
            :label="`${matchingSecrets.length} found`"
          />
        </div>

        <!-- Matching items list -->
        <div v-if="matchingSecrets.length > 0" class="space-y-1.5">
          <div
            v-for="s in matchingSecrets"
            :key="'match-' + s.name"
            class="bg-surface-gray-2 hover:bg-surface-gray-3 border border-outline-gray-1 rounded-3 p-2 flex items-center justify-between cursor-pointer transition"
            @click="emit('select', s.name)"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <SecretTypeIcon :type="s.secret_type" size="sm" />
              <div class="min-w-0">
                <div class="text-xs font-semibold text-ink-gray-9 truncate">{{ s.title }}</div>
                <div class="text-[11px] text-ink-gray-5 truncate">
                  {{ s.username || s.email || 'No username' }}
                </div>
              </div>
            </div>

            <!-- Quick Action: Autofill & Copy using Frappe UI Button -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <Button
                size="xs"
                variant="solid"
                :icon-left="autofilledSecretName === s.name ? 'lucide-check' : 'lucide-zap'"
                :label="autofilledSecretName === s.name ? 'Filled' : 'Fill'"
                tooltip="Autofill on page"
                @click="handleQuickAutofill(s, $event)"
              />
              <Button
                size="xs"
                variant="ghost"
                :icon="copiedSecretName === s.name ? 'lucide-check' : 'lucide-copy'"
                :theme="copiedSecretName === s.name ? 'green' : 'gray'"
                :label="copiedSecretName === s.name ? 'Copied' : 'Copy Password'"
                tooltip="Copy Password"
                @click="handleQuickCopyPassword(s, $event)"
              />
            </div>
          </div>
        </div>

        <!-- No matching items for active tab -->
        <div v-else class="text-center py-2">
          <p class="text-[11px] text-ink-gray-5 mb-1.5">No vault items for this site yet</p>
          <Button
            size="xs"
            variant="subtle"
            icon-left="lucide-plus"
            :label="`Add secret for ${activeTab.domain}`"
            @click="handleAddForCurrentTab"
          />
        </div>
      </div>

      <!-- Main Vault Secrets List -->
      <div>
        <div
          class="text-[11px] font-bold text-ink-gray-5 px-1 mb-1.5 flex items-center justify-between"
        >
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="truncate">{{
              activeTabFilter === 'bookmarks' ? 'Bookmarked Secrets' : 'Vault Secrets'
            }}</span>
            <span v-if="selectedType !== 'All'" class="text-ink-gray-4">•</span>
            <span v-if="selectedType !== 'All'" class="text-ink-gray-7 truncate">{{
              selectedType
            }}</span>
            <Button
              v-if="selectedType !== 'All' || activeTabFilter === 'bookmarks'"
              size="xs"
              variant="ghost"
              label="Reset"
              class="text-[10px] h-4 px-1 text-ink-gray-5 hover:text-ink-gray-9 flex-shrink-0"
              @click="clearFilters"
            />
          </div>
          <span class="flex-shrink-0">{{
            totalSecrets > secrets.length &&
            !searchQuery &&
            selectedType === 'All' &&
            activeTabFilter === 'all'
              ? `${filteredSecrets.length} of ${totalSecrets}`
              : filteredSecrets.length
          }}</span>
        </div>

        <!-- Loading State -->
        <div
          v-if="isLoading && secrets.length === 0"
          class="py-12 flex flex-col items-center justify-center text-ink-gray-5 text-xs gap-2"
        >
          <Spinner size="md" />
          <span>Loading vault...</span>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="filteredSecrets.length === 0"
          class="py-10 text-center px-4 flex flex-col items-center"
        >
          <div
            class="w-10 h-10 rounded-full bg-surface-gray-3 border border-outline-gray-2 flex items-center justify-center text-ink-gray-5 mb-2.5"
          >
            <Icon
              :icon="
                searchQuery
                  ? 'lucide-search'
                  : activeTabFilter === 'bookmarks'
                    ? 'lucide-bookmark'
                    : 'lucide-lock'
              "
              class="size-4"
            />
          </div>
          <p class="text-xs text-ink-gray-8 font-semibold mb-1">
            {{
              searchQuery
                ? 'No matching secrets'
                : activeTabFilter === 'bookmarks'
                  ? 'No bookmarks yet'
                  : selectedType !== 'All'
                    ? `No ${selectedType} secrets`
                    : 'Vault is empty'
            }}
          </p>
          <p class="text-[11px] text-ink-gray-5 mb-3.5 max-w-[240px]">
            {{
              searchQuery
                ? 'Try adjusting your search terms or clear the filter'
                : activeTabFilter === 'bookmarks'
                  ? 'Bookmark your frequently used credentials for quick access'
                  : selectedType !== 'All'
                    ? `No secrets found matching type "${selectedType}"`
                    : 'Add your first password or credential to get started'
            }}
          </p>
          <Button
            v-if="!searchQuery && activeTabFilter === 'all' && selectedType === 'All'"
            size="sm"
            variant="solid"
            icon-left="lucide-plus"
            label="Add New Secret"
            @click="emit('new-secret')"
          />
          <Button
            v-else
            size="xs"
            variant="subtle"
            label="Reset filters"
            icon-left="lucide-rotate-ccw"
            @click="clearFilters"
          />
        </div>

        <!-- Secrets Items List (Espresso card list) -->
        <div v-else class="space-y-1.5">
          <div
            v-for="s in filteredSecrets"
            :key="s.name"
            class="bg-surface-base hover:bg-surface-gray-1 active:bg-surface-gray-2 border border-outline-gray-2 hover:border-outline-gray-3 rounded-4 p-2.5 flex items-center justify-between cursor-pointer transition shadow-2xs group"
            @click="emit('select', s.name)"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
              <SecretTypeIcon :type="s.secret_type" size="md" />
              <div class="min-w-0">
                <div class="text-xs font-semibold text-ink-gray-9 truncate">
                  {{ s.title }}
                </div>
                <div class="text-[11px] text-ink-gray-5 truncate flex items-center gap-1.5 mt-0.5">
                  <span>{{ s.username || s.email || s.secret_type }}</span>
                  <span
                    v-if="s.folder_name"
                    class="inline-flex items-center gap-0.5 text-[10px] text-ink-gray-4"
                  >
                    • <Icon icon="lucide-folder" class="size-2.5" /> {{ s.folder_name }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Item Actions -->
            <div class="flex items-center gap-1 flex-shrink-0" @click.stop>
              <Button
                size="xs"
                variant="ghost"
                :tooltip="s.is_bookmark ? 'Remove from bookmarks' : 'Add to bookmarks'"
                @click.stop="handleToggleBookmark(s, $event)"
              >
                <template #icon>
                  <BookmarkIcon
                    :filled="Boolean(s.is_bookmark)"
                    class="size-3.5 transition-colors"
                    :class="
                      s.is_bookmark ? 'text-amber-500' : 'text-ink-gray-4 hover:text-amber-500'
                    "
                  />
                </template>
              </Button>
              <Button
                size="xs"
                variant="ghost"
                :icon="copiedSecretName === s.name ? 'lucide-check' : 'lucide-copy'"
                :theme="copiedSecretName === s.name ? 'green' : 'gray'"
                :label="copiedSecretName === s.name ? 'Copied' : 'Copy Password'"
                tooltip="Copy Password"
                @click.stop="handleQuickCopyPassword(s, $event)"
              />
            </div>
          </div>

          <!-- Load More Section (Pattern A) -->
          <div v-if="hasMore && !searchQuery" class="pt-2 pb-1 text-center space-y-1.5">
            <div
              class="text-[10px] text-ink-gray-5 flex items-center justify-center gap-1 font-medium"
            >
              <span>Showing {{ secrets.length }} of {{ totalSecrets }} secrets</span>
            </div>
            <Button
              size="xs"
              variant="subtle"
              :loading="isLoadingMore"
              icon-left="lucide-chevron-down"
              :label="`Load more (${remainingCount} remaining)`"
              class="w-full justify-center text-ink-gray-7 hover:text-ink-gray-9"
              @click="handleLoadMore"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Pinned Footer: Quick Full-Tab Management Bar -->
    <div
      class="px-3.5 py-2 bg-surface-base border-t border-outline-gray-2 flex items-center justify-between text-xs flex-shrink-0"
    >
      <div class="flex items-center gap-1.5 text-ink-gray-5 text-[11px] min-w-0">
        <span class="truncate font-medium text-ink-gray-7">{{
          authState?.user || 'Connected'
        }}</span>
        <span class="text-ink-gray-3">•</span>
        <span class="text-ink-gray-4">
          {{
            !searchQuery && selectedType === 'All' && activeTabFilter === 'all' && totalSecrets > 0
              ? `${totalSecrets} secrets`
              : `${filteredSecrets.length} ${filteredSecrets.length === 1 ? 'item' : 'items'}`
          }}
        </span>
      </div>
      <Button
        size="xs"
        variant="subtle"
        icon-right="lucide-external-link"
        label="Manage"
        tooltip="Open Frappe Vault in a new tab"
        @click="handleOpenFullVault('')"
      />
    </div>
  </div>
</template>
