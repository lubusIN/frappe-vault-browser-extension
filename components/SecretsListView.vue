<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useVaultApi } from '../composables/useVaultApi';
import { useActiveTab } from '../composables/useActiveTab';
import type { VaultSecretSummary } from '../types/vault';
import SecretTypeIcon from './SecretTypeIcon.vue';
import { matchesDomain, copyText } from '../utils/helpers';
import {
  Search,
  Plus,
  Wand2,
  Settings,
  Star,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Globe,
  Folder,
  X,
} from '@lucide/vue';

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
      await copyText(pwd);
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
  <div class="flex flex-col h-full bg-slate-50 text-slate-800">
    <!-- Top Action Header -->
    <div class="px-3.5 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs">
          V
        </div>
        <span class="text-xs font-bold text-slate-900">Frappe Vault</span>
      </div>

      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="emit('open-generator')"
          title="Password Generator"
          class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
        >
          <Wand2 class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="emit('new-secret')"
          title="Add New Secret"
          class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <Plus class="w-4 h-4" />
        </button>
        <button
          type="button"
          @click="emit('open-settings')"
          title="Settings"
          class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
        >
          <Settings class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Search & Filter Controls -->
    <div class="px-3 py-2 bg-white border-b border-slate-200/80 space-y-2 flex-shrink-0">
      <!-- Search Input -->
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
          <Search class="w-3.5 h-3.5" />
        </span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search secrets..."
          class="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        <button
          v-if="searchQuery"
          type="button"
          @click="searchQuery = ''"
          class="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Tab View (All vs Bookmarks) & Type Filter Pills -->
      <div class="flex items-center justify-between gap-2 text-xs">
        <div class="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
          <button
            type="button"
            class="px-2.5 py-1 rounded-md transition"
            :class="activeTabFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'"
            @click="activeTabFilter = 'all'"
          >
            All Items
          </button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-md transition flex items-center gap-1"
            :class="activeTabFilter === 'bookmarks' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'"
            @click="activeTabFilter = 'bookmarks'"
          >
            <Star class="w-3 h-3 text-amber-500 fill-amber-400" />
            <span>Starred</span>
          </button>
        </div>

        <!-- Refresh button -->
        <button
          type="button"
          @click="fetchVaultSecrets"
          title="Refresh Vault"
          class="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>

      <!-- Type Pill Badges (Horizontal scroll) -->
      <div class="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[11px]">
        <button
          v-for="st in secretTypes"
          :key="st"
          type="button"
          @click="selectedType = st"
          class="px-2 py-0.5 rounded-full border transition whitespace-nowrap"
          :class="selectedType === st ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
        >
          {{ st }}
        </button>
      </div>
    </div>

    <!-- Scrollable Content Area -->
    <div class="flex-1 overflow-y-auto p-3 space-y-3">
      <!-- Active Tab Matching Section -->
      <div
        v-if="activeTab?.domain && !searchQuery && activeTabFilter === 'all'"
        class="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 shadow-xs space-y-2"
      >
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 font-bold text-blue-900">
            <Globe class="w-3.5 h-3.5 text-blue-600" />
            <span class="truncate">{{ activeTab.domain }}</span>
          </div>
          <span class="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded-full">
            {{ matchingSecrets.length }} found
          </span>
        </div>

        <!-- Matching items list -->
        <div v-if="matchingSecrets.length > 0" class="space-y-1.5">
          <div
            v-for="s in matchingSecrets"
            :key="'match-' + s.name"
            @click="emit('select', s.name)"
            class="bg-white hover:bg-slate-50 border border-blue-100 rounded-lg p-2 flex items-center justify-between cursor-pointer transition shadow-2xs"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <SecretTypeIcon :type="s.secret_type" size="sm" />
              <div class="min-w-0">
                <div class="text-xs font-semibold text-slate-900 truncate">{{ s.title }}</div>
                <div class="text-[10px] text-slate-500 truncate">{{ s.username || s.email || 'No username' }}</div>
              </div>
            </div>

            <!-- Quick Action: Autofill & Copy -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                @click="handleQuickAutofill(s, $event)"
                title="Autofill on page"
                class="p-1 rounded text-blue-600 hover:bg-blue-50 transition"
              >
                <Check v-if="autofilledSecretName === s.name" class="w-3.5 h-3.5 text-emerald-600" />
                <Zap v-else class="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                @click="handleQuickCopyPassword(s, $event)"
                title="Copy Password"
                class="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <Check v-if="copiedSecretName === s.name" class="w-3.5 h-3.5 text-emerald-600" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- No matching items for active tab -->
        <div v-else class="text-center py-2">
          <p class="text-[11px] text-blue-800/80 mb-1.5">No vault items for this site yet</p>
          <button
            type="button"
            @click="handleAddForCurrentTab"
            class="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-100/50 border border-blue-200 text-blue-700 rounded-md text-[11px] font-semibold transition"
          >
            <Plus class="w-3 h-3" />
            <span>Add secret for {{ activeTab.domain }}</span>
          </button>
        </div>
      </div>

      <!-- Main Vault Secrets List -->
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5 flex items-center justify-between">
          <span>{{ activeTabFilter === 'bookmarks' ? 'Starred Secrets' : 'Vault Secrets' }}</span>
          <span>{{ filteredSecrets.length }}</span>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
          <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading vault...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredSecrets.length === 0" class="py-10 text-center px-4">
          <p class="text-xs text-slate-500 font-medium mb-2">No secrets found</p>
          <p class="text-[11px] text-slate-400 mb-3">
            {{ searchQuery ? 'Try adjusting your search terms' : 'Add your first password or credential' }}
          </p>
          <button
            type="button"
            @click="emit('new-secret')"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Add New Secret</span>
          </button>
        </div>

        <!-- Secrets Items List -->
        <div v-else class="space-y-1.5">
          <div
            v-for="s in filteredSecrets"
            :key="s.name"
            @click="emit('select', s.name)"
            class="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition shadow-2xs group"
          >
            <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
              <SecretTypeIcon :type="s.secret_type" size="md" />
              <div class="min-w-0">
                <div class="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition">
                  {{ s.title }}
                </div>
                <div class="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                  <span>{{ s.username || s.email || s.secret_type }}</span>
                  <span v-if="s.folder_name" class="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                    • <Folder class="w-2.5 h-2.5" /> {{ s.folder_name }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Item Actions -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                @click="handleToggleBookmark(s, $event)"
                class="p-1 rounded-md text-slate-300 hover:text-amber-500 transition"
                :class="{ '!text-amber-500': s.is_bookmark }"
              >
                <Star class="w-3.5 h-3.5" :class="{ 'fill-amber-400': s.is_bookmark }" />
              </button>
              <button
                type="button"
                @click="handleQuickCopyPassword(s, $event)"
                title="Copy Password"
                class="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <Check v-if="copiedSecretName === s.name" class="w-3.5 h-3.5 text-emerald-600" />
                <Copy v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
