<script setup lang="ts">
import { ref } from 'vue';
import { useVaultAuth } from '../composables/useVaultAuth';
import { Shield, Lock, Key, Server, Eye, EyeOff, AlertCircle } from '@lucide/vue';

const { loginWithPassword, loginWithToken, authError, isAuthLoading } = useVaultAuth();

const instanceUrl = ref('');
const authMode = ref<'password' | 'token'>('password');

// Password fields
const username = ref('');
const password = ref('');
const showPassword = ref(false);

// Token fields
const apiKey = ref('');
const apiSecret = ref('');
const showApiSecret = ref(false);

async function handleConnect() {
  if (!instanceUrl.value.trim()) return;

  if (authMode.value === 'password') {
    if (!username.value || !password.value) return;
    await loginWithPassword(instanceUrl.value, username.value, password.value);
  } else {
    if (!apiKey.value || !apiSecret.value) return;
    await loginWithToken(instanceUrl.value, apiKey.value, apiSecret.value);
  }
}

function setLocalDev() {
  instanceUrl.value = 'http://localhost:8000';
  username.value = 'Administrator';
}
</script>

<template>
  <div class="flex flex-col h-full bg-slate-50 text-slate-800">
    <!-- Header / Brand -->
    <div class="pt-8 pb-4 px-6 text-center flex flex-col items-center">
      <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 mb-3">
        <Shield class="w-7 h-7" />
      </div>
      <h1 class="text-xl font-bold tracking-tight text-slate-900">Frappe Vault</h1>
      <p class="text-xs text-slate-500 mt-1">Connect to your hosted vault instance</p>
    </div>

    <!-- Mode Selector Tabs -->
    <div class="px-6 mb-4">
      <div class="bg-slate-200/70 p-0.5 rounded-lg flex text-xs font-medium">
        <button
          type="button"
          class="flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5"
          :class="authMode === 'password' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
          @click="authMode = 'password'"
        >
          <Lock class="w-3.5 h-3.5" />
          User Login
        </button>
        <button
          type="button"
          class="flex-1 py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5"
          :class="authMode === 'token' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
          @click="authMode = 'token'"
        >
          <Key class="w-3.5 h-3.5" />
          API Token
        </button>
      </div>
    </div>

    <!-- Main Form -->
    <div class="flex-1 px-6 overflow-y-auto">
      <form @submit.prevent="handleConnect" class="space-y-3.5">
        <!-- Instance URL -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">
            Instance URL
          </label>
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Server class="w-4 h-4" />
            </span>
            <input
              v-model="instanceUrl"
              type="text"
              placeholder="https://vault.example.com"
              required
              class="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        <!-- Mode: Password -->
        <template v-if="authMode === 'password'">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Email or Username
            </label>
            <input
              v-model="username"
              type="text"
              placeholder="user@example.com"
              required
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••••••"
                required
                class="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <EyeOff v-if="showPassword" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </template>

        <!-- Mode: Token -->
        <template v-else>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              API Key
            </label>
            <input
              v-model="apiKey"
              type="text"
              placeholder="e.g. 5e91bc..."
              required
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              API Secret
            </label>
            <div class="relative">
              <input
                v-model="apiSecret"
                :type="showApiSecret ? 'text' : 'password'"
                placeholder="••••••••••••"
                required
                class="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono"
              />
              <button
                type="button"
                @click="showApiSecret = !showApiSecret"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                <EyeOff v-if="showApiSecret" class="w-4 h-4" />
                <Eye v-else class="w-4 h-4" />
              </button>
            </div>
            <p class="text-[10px] text-slate-400 mt-1">
              Find in Frappe under User Profile &gt; API Access &gt; Generate Keys.
            </p>
          </div>
        </template>

        <!-- Error Message -->
        <div v-if="authError" class="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
          <AlertCircle class="w-4 h-4 flex-shrink-0 text-rose-500 mt-0.5" />
          <span class="leading-snug">{{ authError }}</span>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button
            type="submit"
            :disabled="isAuthLoading"
            class="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
          >
            <span v-if="isAuthLoading" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            <span>{{ isAuthLoading ? 'Connecting...' : 'Connect to Vault' }}</span>
          </button>
        </div>
      </form>

      <!-- Local dev helper -->
      <div class="mt-4 text-center">
        <button
          type="button"
          @click="setLocalDev"
          class="text-[11px] text-slate-400 hover:text-slate-600 underline"
        >
          Use local development site (localhost:8000)
        </button>
      </div>
    </div>
  </div>
</template>
