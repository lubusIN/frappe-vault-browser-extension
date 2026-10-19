<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useVaultApi } from '../composables/useVaultApi';
import { useVaultAuth } from '../composables/useVaultAuth';
import { useActiveTab } from '../composables/useActiveTab';
import type { VaultSecretDetail, TotpResult } from '../types/vault';
import SecretTypeIcon from './SecretTypeIcon.vue';
import { copyText, formatRelativeTime } from '../utils/helpers';
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Clock,
  Globe,
  User,
  KeyRound,
  ShieldAlert,
  Zap,
  Folder,
} from '@lucide/vue';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const props = defineProps<{
  secretName: string;
}>();

const { getSecret, decryptSecret, getTotp, toggleBookmark } = useVaultApi();
const { authState } = useVaultAuth();
const { activeTab, autofillCredentials } = useActiveTab();

const secret = ref<VaultSecretDetail | null>(null);
const isLoading = ref(true);
const isDecrypting = ref(false);
const error = ref<string | null>(null);

const showPassword = ref(false);
const showApiSecret = ref(false);
const showCardCvv = ref(false);

// Copied indicators map
const copiedField = ref<string | null>(null);
const autofillStatus = ref<'idle' | 'success' | 'failed'>('idle');

// TOTP live state
const totpData = ref<TotpResult | null>(null);
let totpTimer: any = null;

async function loadSecret() {
  isLoading.value = true;
  error.value = null;
  try {
    const data = await getSecret(props.secretName, false);
    secret.value = data;

    // Check if secret has TOTP
    if (data.has_totp) {
      fetchLiveTotp();
      startTotpCountdown();
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load secret details';
  } finally {
    isLoading.value = false;
  }
}

async function revealPassword() {
  if (showPassword.value) {
    showPassword.value = false;
    return;
  }

  if (!secret.value?.decrypted?.password) {
    isDecrypting.value = true;
    try {
      const full = await decryptSecret(props.secretName);
      if (secret.value) {
        secret.value.decrypted = full.decrypted;
      }
    } catch (err: any) {
      console.error('Decryption failed:', err);
    } finally {
      isDecrypting.value = false;
    }
  }

  showPassword.value = true;
}

async function handleCopy(text?: string | null, fieldKey: string = 'general') {
  if (!text) {
    // If copying password and not yet decrypted
    if (fieldKey === 'password' && !secret.value?.decrypted?.password) {
      isDecrypting.value = true;
      try {
        const full = await decryptSecret(props.secretName);
        if (secret.value) {
          secret.value.decrypted = full.decrypted;
          text = full.decrypted?.password;
        }
      } catch (err) {
        isDecrypting.value = false;
        return;
      }
      isDecrypting.value = false;
    }
  }

  if (!text) return;
  const ok = await copyText(text);
  if (ok) {
    copiedField.value = fieldKey;
    setTimeout(() => {
      if (copiedField.value === fieldKey) {
        copiedField.value = null;
      }
    }, 2000);
  }
}

async function handleAutofill() {
  autofillStatus.value = 'idle';
  let pwd = secret.value?.decrypted?.password;
  if (!pwd && secret.value?.has_password) {
    try {
      const full = await decryptSecret(props.secretName);
      if (secret.value) {
        secret.value.decrypted = full.decrypted;
        pwd = full.decrypted?.password;
      }
    } catch {}
  }

  const ok = await autofillCredentials(secret.value?.username || secret.value?.email || '', pwd || '');
  autofillStatus.value = ok ? 'success' : 'failed';
  setTimeout(() => {
    autofillStatus.value = 'idle';
  }, 3000);
}

async function handleToggleBookmark() {
  if (!secret.value) return;
  try {
    const res = await toggleBookmark(secret.value.name);
    secret.value.is_bookmark = res.is_bookmark;
  } catch {}
}

async function fetchLiveTotp() {
  try {
    const res = await getTotp(props.secretName);
    totpData.value = res;
  } catch {}
}

function startTotpCountdown() {
  clearInterval(totpTimer);
  totpTimer = setInterval(() => {
    if (totpData.value && totpData.value.remaining_seconds > 1) {
      totpData.value.remaining_seconds--;
    } else {
      fetchLiveTotp();
    }
  }, 1000);
}

const openInVaultUrl = computed(() => {
  if (!authState.value?.instanceUrl || !secret.value?.name) return '#';
  return `${authState.value.instanceUrl}/vault/secret/${secret.value.name}`;
});

onMounted(() => {
  loadSecret();
});

onUnmounted(() => {
  clearInterval(totpTimer);
});
</script>

<template>
  <div class="flex flex-col h-full bg-slate-50 text-slate-800">
    <!-- Top Action Bar -->
    <div class="px-3 py-2 bg-white border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
      <button
        type="button"
        @click="emit('back')"
        class="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 p-1 -ml-1 rounded-md transition"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Vault</span>
      </button>

      <div class="flex items-center gap-1">
        <button
          type="button"
          @click="handleToggleBookmark"
          title="Bookmark"
          class="p-1.5 rounded-md hover:bg-slate-100 transition"
          :class="secret?.is_bookmark ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'"
        >
          <Star class="w-4 h-4" :class="{ 'fill-amber-400': secret?.is_bookmark }" />
        </button>
        <a
          :href="openInVaultUrl"
          target="_blank"
          title="Open in Frappe Vault"
          class="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition"
        >
          <ExternalLink class="w-4 h-4" />
        </a>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center p-6 text-slate-400 text-xs">
      <div class="flex flex-col items-center gap-2">
        <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading secret...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 p-6 text-center">
      <div class="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs mb-3">
        {{ error }}
      </div>
      <button
        type="button"
        @click="loadSecret"
        class="text-xs font-semibold text-blue-600 hover:underline"
      >
        Try again
      </button>
    </div>

    <!-- Secret Details Body -->
    <div v-else-if="secret" class="flex-1 p-4 overflow-y-auto space-y-4">
      <!-- Title & Badges Header -->
      <div class="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        <SecretTypeIcon :type="secret.secret_type" size="md" />
        <div class="flex-1 min-w-0">
          <h1 class="text-sm font-bold text-slate-900 truncate">{{ secret.title }}</h1>
          <div class="flex items-center gap-1.5 mt-1 flex-wrap">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
              {{ secret.secret_type }}
            </span>
            <span v-if="secret.folder_name" class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
              <Folder class="w-2.5 h-2.5" />
              {{ secret.folder_name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Quick Autofill Button (When on page) -->
      <div v-if="secret.secret_type === 'Password'">
        <button
          type="button"
          @click="handleAutofill"
          class="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
          :class="autofillStatus === 'success' ? 'bg-emerald-600 text-white' : autofillStatus === 'failed' ? 'bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'"
        >
          <Zap class="w-3.5 h-3.5" />
          <span v-if="autofillStatus === 'success'">Autofilled into page!</span>
          <span v-else-if="autofillStatus === 'failed'">No matching input fields on page</span>
          <span v-else>Autofill on current page</span>
        </button>
      </div>

      <!-- Credential Fields Cards -->
      <div class="bg-white rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
        <!-- Website URL -->
        <div v-if="secret.url" class="p-3 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
            <Globe class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div class="min-w-0">
              <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Website</div>
              <a
                :href="secret.url"
                target="_blank"
                class="text-blue-600 hover:underline truncate block text-xs"
              >
                {{ secret.url }}
              </a>
            </div>
          </div>
          <button
            type="button"
            @click="handleCopy(secret.url, 'url')"
            class="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition"
          >
            <Check v-if="copiedField === 'url'" class="w-3.5 h-3.5 text-emerald-600" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Username / Email -->
        <div v-if="secret.username || secret.email" class="p-3 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
            <User class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div class="min-w-0">
              <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Username</div>
              <div class="font-medium text-slate-800 truncate select-all">
                {{ secret.username || secret.email }}
              </div>
            </div>
          </div>
          <button
            type="button"
            @click="handleCopy(secret.username || secret.email, 'username')"
            class="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition"
          >
            <Check v-if="copiedField === 'username'" class="w-3.5 h-3.5 text-emerald-600" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Password Field -->
        <div v-if="secret.has_password || secret.secret_type === 'Password'" class="p-3 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
            <KeyRound class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Password</span>
                <span v-if="secret.password_strength" class="text-[10px] font-medium text-emerald-600">
                  {{ secret.password_strength }}
                </span>
              </div>
              <div class="font-mono font-medium text-slate-800 truncate select-all">
                <span v-if="showPassword && secret.decrypted?.password">
                  {{ secret.decrypted.password }}
                </span>
                <span v-else-if="isDecrypting" class="text-slate-400 text-xs italic">
                  Decrypting...
                </span>
                <span v-else class="tracking-widest">
                  ••••••••••••
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              @click="revealPassword"
              title="Reveal / Hide"
              class="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition"
            >
              <EyeOff v-if="showPassword" class="w-3.5 h-3.5" />
              <Eye v-else class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              @click="handleCopy(secret.decrypted?.password, 'password')"
              title="Copy Password"
              class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
            >
              <Check v-if="copiedField === 'password'" class="w-3.5 h-3.5 text-emerald-600" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Live TOTP (2FA) Code -->
        <div v-if="secret.has_totp" class="p-3 bg-blue-50/50 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
            <Clock class="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <div>
              <div class="text-[10px] text-blue-700 uppercase font-bold tracking-wider flex items-center gap-2">
                <span>One-Time Password (2FA)</span>
                <span class="text-[10px] font-mono font-semibold text-blue-600 bg-blue-100/80 px-1 rounded">
                  {{ totpData?.remaining_seconds ?? 30 }}s
                </span>
              </div>
              <div class="font-mono text-base font-bold text-blue-900 tracking-wider mt-0.5">
                {{ totpData?.code || '••••••' }}
              </div>
            </div>
          </div>
          <button
            type="button"
            @click="handleCopy(totpData?.code, 'totp')"
            title="Copy TOTP Code"
            class="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition"
          >
            <Check v-if="copiedField === 'totp'" class="w-3.5 h-3.5 text-emerald-600" />
            <Copy v-else class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- API Key Specific -->
        <template v-if="secret.secret_type === 'API Key'">
          <div v-if="secret.api_key" class="p-3 flex items-center justify-between text-xs">
            <div class="min-w-0 flex-1 pr-2">
              <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">API Key</div>
              <div class="font-mono text-xs text-slate-800 truncate select-all">{{ secret.api_key }}</div>
            </div>
            <button type="button" @click="handleCopy(secret.api_key, 'api_key')" class="p-1.5 text-slate-400 hover:text-slate-700">
              <Check v-if="copiedField === 'api_key'" class="w-3.5 h-3.5 text-emerald-600" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </template>

        <!-- Credit Card Specific -->
        <template v-if="secret.secret_type === 'Credit Card'">
          <div v-if="secret.card_holder" class="p-3 text-xs">
            <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Card Holder</div>
            <div class="font-medium text-slate-800">{{ secret.card_holder }}</div>
          </div>
          <div v-if="secret.card_expiry" class="p-3 text-xs">
            <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Expires</div>
            <div class="font-medium text-slate-800">{{ secret.card_expiry }}</div>
          </div>
        </template>

        <!-- Notes -->
        <div v-if="secret.notes" class="p-3 text-xs">
          <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Notes</div>
          <div class="text-slate-700 whitespace-pre-wrap text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
            {{ secret.notes }}
          </div>
        </div>
      </div>

      <!-- Metadata footer -->
      <div class="text-[11px] text-slate-400 px-1 flex items-center justify-between">
        <span>ID: {{ secret.name }}</span>
        <span>Updated {{ formatRelativeTime(secret.modified) }}</span>
      </div>
    </div>
  </div>
</template>
