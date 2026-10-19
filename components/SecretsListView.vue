<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useVaultApi } from '../composables/useVaultApi';
import { useActiveTab } from '../composables/useActiveTab';
import type { VaultSecretSummary } from '../types/vault';
import SecretTypeIcon from './SecretTypeIcon.vue';
import { matchesDomain, copyText } from '../utils/helpers';
import { Button, TextInput, Badge, Spinner, TabButtons, Icon } from 'frappe-ui';

const emit = defineEmits<{
  (e: 'select', secretName: string): void;
  (e: 'new-secret', initialUrl?: string, initialTitle?: string): void;
  (e: 'open-generator'): void;
  (e: 'open-settings'): void;
}>();

const { getSecrets, decryptSecret, toggleBookmark } = useVaultApi();
const { activeTab, autofillCredentials } = useActiveTab();

const secrets = ref<VaultSecretSummary[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const activeTabFilter = ref<'all' | 'bookmarks'>('all');
const selectedType = ref<string>('All');

const copiedSecretName = ref<string | null>(null);
const autofilledSecretName = ref<string | null>(null);

const secretTypes = ['All', 'Password', 'API Key', 'Note', 'Credit Card', 'Database'];

const viewFilterOptions = [
  { label: 'All Items', value: 'all' },
  { label: 'Starred', value: 'bookmarks', iconLeft: 'lucide-star' },
];

async function fetchVaultSecrets() {
  isLoading.value = true;
  try {
    const res = await getSecrets({
      limit: 100,
      order_by: 'modified desc',
    });
    secrets.value = res.secrets || [];
  } catch (err) {
    console.error('Failed to fetch secrets:', err);
  } finally {
    isLoading.value = false;
  }
}

// Matching secrets for the active tab domain
const matchingSecrets = computed(() => {
  if (!activeTab.value?.domain) return [];
  return secrets.value.filter(s =>
    matchesDomain(s.url, s.title, activeTab.value?.domain)
  );
});

// Filtered secrets list
const filteredSecrets = computed(() => {
  return secrets.value.filter(s => {
    // Bookmark filter
    if (activeTabFilter.value === 'bookmarks' && !s.is_bookmark) {
      return false;
    }

    // Type filter
    if (selectedType.value !== 'All' && s.secret_type !== selectedType.value) {
      return false;
    }

    // Search query
    if (searchQuery.value.trim()) {
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
    const pwd = full.decrypted?.password || full.decrypted?.api_secret || full.decrypted?.card_number;
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
    const pwd = full.decrypted?.password || '';
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

async function handleToggleBookmark(secret: VaultSecretSummary, event: Event) {
  event.stopPropagation();
  try {
    const res = await toggleBookmark(secret.name);
    secret.is_bookmark = res.is_bookmark;
  } catch {}
}

function handleAddForCurrentTab() {
  emit('new-secret', activeTab.value?.url, activeTab.value?.title || activeTab.value?.domain);
}

onMounted(() => {
  fetchVaultSecrets();
});
</script>

<template>
  <div class="flex flex-col h-full bg-surface-gray-2 text-ink-gray-9">
    <!-- Top Action Header (Espresso Appbar) -->
    <div class="px-3.5 py-2 bg-surface-base border-b border-outline-gray-2 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-surface-gray-10 text-ink-base rounded-3 flex items-center justify-center shadow-xs">
          <Icon icon="lucide-shield" class="size-3.5" />
        </div>
        <span class="text-xs font-bold tracking-tight text-ink-gray-9">Frappe Vault</span>
      </div>

      <div class="flex items-center gap-1">
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
          variant="ghost"
          icon="lucide-plus"
          label="Add New Secret"
          tooltip="Add New Secret"
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

    <!-- Search & Filter Controls -->
    <div class="px-3 py-2 bg-surface-base border-b border-outline-gray-2 space-y-2 flex-shrink-0">
      <!-- Search Input using Frappe UI TextInput -->
      <TextInput
        v-model="searchQuery"
        type="text"
        placeholder="Search secrets..."
        size="sm"
        variant="subtle"
      >
        <template #prefix>
          <Icon icon="lucide-search" class="size-3.5 text-ink-gray-4" />
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
        </template>
      </TextInput>

      <!-- View Selector (All vs Starred) & Refresh using Frappe UI TabButtons -->
      <div class="flex items-center justify-between gap-2 text-xs">
        <TabButtons
          v-model="activeTabFilter"
          :options="viewFilterOptions"
          variant="subtle"
          size="sm"
        />

        <!-- Refresh button -->
        <Button
          size="xs"
          variant="ghost"
          icon="lucide-refresh-cw"
          :loading="isLoading"
          label="Refresh Vault"
          tooltip="Refresh Vault"
          @click="fetchVaultSecrets"
        />
      </div>

      <!-- Type Pill Badges (Espresso subtle buttons) -->
      <div class="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar text-xs">
        <Button
          v-for="st in secretTypes"
          :key="st"
          size="xs"
          :variant="selectedType === st ? 'solid' : 'subtle'"
          :label="st"
          @click="selectedType = st"
          class="whitespace-nowrap"
        />
      </div>
    </div>

    <!-- Scrollable Content Area -->
    <div class="flex-1 overflow-y-auto p-3 space-y-3">
      <!-- Active Tab Matching Section -->
      <div
        v-if="activeTab?.domain && !searchQuery && activeTabFilter === 'all'"
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
            :label="`${matchingSecrets.length} found`"
          />
        </div>

        <!-- Matching items list -->
        <div v-if="matchingSecrets.length > 0" class="space-y-1.5">
          <div
            v-for="s in matchingSecrets"
            :key="'match-' + s.name"
            @click="emit('select', s.name)"
            class="bg-surface-gray-2 hover:bg-surface-gray-3 border border-outline-gray-1 rounded-3 p-2 flex items-center justify-between cursor-pointer transition"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <SecretTypeIcon :type="s.secret_type" size="sm" />
              <div class="min-w-0">
                <div class="text-xs font-semibold text-ink-gray-9 truncate">{{ s.title }}</div>
                <div class="text-[11px] text-ink-gray-5 truncate">{{ s.username || s.email || 'No username' }}</div>
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
        <div class="text-[11px] font-bold text-ink-gray-5 px-1 mb-1.5 flex items-center justify-between">
          <span>{{ activeTabFilter === 'bookmarks' ? 'Starred Secrets' : 'Vault Secrets' }}</span>
          <span>{{ filteredSecrets.length }}</span>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="py-12 flex flex-col items-center justify-center text-ink-gray-5 text-xs gap-2">
          <Spinner size="md" />
          <span>Loading vault...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredSecrets.length === 0" class="py-10 text-center px-4 flex flex-col items-center">
          <div class="w-10 h-10 rounded-full bg-surface-gray-3 border border-outline-gray-2 flex items-center justify-center text-ink-gray-5 mb-2.5">
            <Icon :icon="searchQuery ? 'lucide-search' : activeTabFilter === 'bookmarks' ? 'lucide-star' : 'lucide-lock'" class="size-4" />
          </div>
          <p class="text-xs text-ink-gray-8 font-semibold mb-1">
            {{ searchQuery ? 'No matching secrets' : activeTabFilter === 'bookmarks' ? 'No starred secrets' : 'Vault is empty' }}
          </p>
          <p class="text-[11px] text-ink-gray-5 mb-3.5 max-w-[240px]">
            {{ searchQuery ? 'Try adjusting your search terms or clear the filter' : activeTabFilter === 'bookmarks' ? 'Star your frequently used credentials for quick access' : 'Add your first password or credential to get started' }}
          </p>
          <Button
            v-if="!searchQuery && activeTabFilter === 'all'"
            size="sm"
            variant="solid"
            icon-left="lucide-plus"
            label="Add New Secret"
            @click="emit('new-secret')"
          />
          <Button
            v-else-if="searchQuery"
            size="xs"
            variant="subtle"
            label="Clear search"
            @click="searchQuery = ''"
          />
          <Button
            v-else-if="activeTabFilter === 'bookmarks'"
            size="xs"
            variant="subtle"
            label="Show all items"
            @click="activeTabFilter = 'all'"
          />
        </div>

        <!-- Secrets Items List (Espresso card list) -->
        <div v-else class="space-y-1.5">
          <div
            v-for="s in filteredSecrets"
            :key="s.name"
            @click="emit('select', s.name)"
            class="bg-surface-base hover:bg-surface-gray-1 active:bg-surface-gray-2 border border-outline-gray-2 hover:border-outline-gray-3 rounded-4 p-2.5 flex items-center justify-between cursor-pointer transition shadow-2xs group"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
              <SecretTypeIcon :type="s.secret_type" size="md" />
              <div class="min-w-0">
                <div class="text-xs font-semibold text-ink-gray-9 truncate">
                  {{ s.title }}
                </div>
                <div class="text-[11px] text-ink-gray-5 truncate flex items-center gap-1.5 mt-0.5">
                  <span>{{ s.username || s.email || s.secret_type }}</span>
                  <span v-if="s.folder_name" class="inline-flex items-center gap-0.5 text-[10px] text-ink-gray-4">
                    • <Icon icon="lucide-folder" class="size-2.5" /> {{ s.folder_name }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Item Actions -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <Button
                size="xs"
                variant="ghost"
                icon="lucide-star"
                :label="s.is_bookmark ? 'Remove Star' : 'Star Secret'"
                :tooltip="s.is_bookmark ? 'Remove Star' : 'Star Secret'"
                :class="s.is_bookmark ? 'text-ink-amber-6' : 'text-ink-gray-4'"
                @click="handleToggleBookmark(s, $event)"
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
      </div>
    </div>
  </div>
</template>
