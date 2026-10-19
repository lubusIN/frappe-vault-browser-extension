<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useVaultApi } from '../composables/useVaultApi';
import { useActiveTab } from '../composables/useActiveTab';
import type { SecretType, VaultFolder } from '../types/vault';
import PasswordGeneratorModal from './PasswordGeneratorModal.vue';
import {
  X,
  Plus,
  KeyRound,
  Wand2,
  Eye,
  EyeOff,
  Folder,
  Globe,
  User,
  AlertCircle,
} from '@lucide/vue';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', secretName: string): void;
}>();

const props = defineProps<{
  initialUrl?: string;
  initialTitle?: string;
}>();

const { createSecret, getFolders } = useVaultApi();
const { activeTab } = useActiveTab();

const isSubmitting = ref(false);
const errorMessage = ref<string | null>(null);
const showPassword = ref(false);
const showGeneratorModal = ref(false);
const folders = ref<VaultFolder[]>([]);

const form = reactive({
  title: props.initialTitle || activeTab.value?.title || activeTab.value?.domain || '',
  secret_type: 'Password' as SecretType,
  url: props.initialUrl || activeTab.value?.url || '',
  username: '',
  password: '',
  folder: '',
  notes: '',
  // Specific fields
  api_key: '',
  api_secret: '',
  card_holder: '',
  card_number: '',
  card_expiry: '',
  card_cvv: '',
});

onMounted(async () => {
  try {
    folders.value = await getFolders();
  } catch {}
});

function handlePasswordSelected(pwd: string) {
  form.password = pwd;
}

async function handleSubmit() {
  if (!form.title.trim()) {
    errorMessage.value = 'Title is required';
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    const payload: Record<string, any> = {
      title: form.title.trim(),
      secret_type: form.secret_type,
      url: form.url.trim(),
      folder: form.folder || undefined,
      notes: form.notes || undefined,
    };

    if (form.secret_type === 'Password') {
      payload.username = form.username;
      payload.password = form.password;
    } else if (form.secret_type === 'API Key') {
      payload.api_key = form.api_key;
      payload.api_secret = form.api_secret;
    } else if (form.secret_type === 'Credit Card') {
      payload.card_holder = form.card_holder;
      payload.card_number = form.card_number;
      payload.card_expiry = form.card_expiry;
      payload.card_cvv = form.card_cvv;
    }

    const res = await createSecret(payload);
    emit('created', res.name);
    emit('close');
  } catch (err: any) {
    console.error('Failed to create secret:', err);
    errorMessage.value = err.message || 'Failed to save secret';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4">
    <div class="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl border border-slate-200 w-full h-[90%] max-h-[520px] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
      <!-- Modal Header -->
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Plus class="w-4 h-4 text-blue-600" />
          Add New Secret
        </h2>
        <button
          type="button"
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-600 p-1 rounded-md"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        <!-- Error Alert -->
        <div v-if="errorMessage" class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-700">
          <AlertCircle class="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Secret Type -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Secret Type</label>
          <select
            v-model="form.secret_type"
            class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Password">Password / Login</option>
            <option value="API Key">API Key</option>
            <option value="Note">Secure Note</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Database">Database Credentials</option>
            <option value="SSH Key">SSH Key</option>
          </select>
        </div>

        <!-- Title -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Title *</label>
          <input
            v-model="form.title"
            type="text"
            placeholder="e.g. GitHub, Google Account"
            required
            class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- URL -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Globe class="w-3.5 h-3.5 text-slate-400" />
            Website URL
          </label>
          <input
            v-model="form.url"
            type="text"
            placeholder="https://example.com/login"
            class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <!-- Password Type Specific Fields -->
        <template v-if="form.secret_type === 'Password'">
          <div>
            <label class="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <User class="w-3.5 h-3.5 text-slate-400" />
              Username or Email
            </label>
            <input
              v-model="form.username"
              type="text"
              placeholder="user@example.com"
              class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="font-semibold text-slate-700 flex items-center gap-1">
                <KeyRound class="w-3.5 h-3.5 text-slate-400" />
                Password
              </label>
              <button
                type="button"
                @click="showGeneratorModal = true"
                class="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Wand2 class="w-3 h-3" />
                Generate
              </button>
            </div>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••••••"
                class="w-full pl-2.5 pr-8 py-1.5 rounded-lg border border-slate-300 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <EyeOff v-if="showPassword" class="w-3.5 h-3.5" />
                <Eye v-else class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </template>

        <!-- API Key Specific Fields -->
        <template v-else-if="form.secret_type === 'API Key'">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">API Key</label>
            <input
              v-model="form.api_key"
              type="text"
              class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
            />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">API Secret</label>
            <input
              v-model="form.api_secret"
              type="password"
              class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
            />
          </div>
        </template>

        <!-- Credit Card Fields -->
        <template v-else-if="form.secret_type === 'Credit Card'">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Card Holder</label>
            <input v-model="form.card_holder" type="text" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300" />
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Card Number</label>
            <input v-model="form.card_number" type="text" placeholder="•••• •••• •••• ••••" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Expiry (MM/YY)</label>
              <input v-model="form.card_expiry" type="text" placeholder="12/28" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">CVV</label>
              <input v-model="form.card_cvv" type="password" placeholder="•••" class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono" />
            </div>
          </div>
        </template>

        <!-- Folder Selection -->
        <div v-if="folders.length > 0">
          <label class="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Folder class="w-3.5 h-3.5 text-slate-400" />
            Folder
          </label>
          <select
            v-model="form.folder"
            class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">(No folder)</option>
            <option v-for="f in folders" :key="f.name" :value="f.name">
              {{ f.folder_name }}
            </option>
          </select>
        </div>

        <!-- Notes -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Notes</label>
          <textarea
            v-model="form.notes"
            rows="2"
            placeholder="Additional secure notes..."
            class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          ></textarea>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="p-3 border-t border-slate-100 flex gap-2">
        <button
          type="button"
          @click="emit('close')"
          class="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="handleSubmit"
          :disabled="isSubmitting"
          class="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
        >
          <span v-if="isSubmitting" class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <span>{{ isSubmitting ? 'Saving...' : 'Save Secret' }}</span>
        </button>
      </div>
    </div>

    <!-- Password Generator Submodal -->
    <PasswordGeneratorModal
      v-if="showGeneratorModal"
      for-selection
      @close="showGeneratorModal = false"
      @select="handlePasswordSelected"
    />
  </div>
</template>
