<script setup lang="ts">
import { computed } from 'vue';
import { useVaultAuth } from '../composables/useVaultAuth';
import {
  ArrowLeft,
  Server,
  User,
  Shield,
  ExternalLink,
  LogOut,
  CheckCircle2,
} from '@lucide/vue';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const { authState, logout } = useVaultAuth();

const vaultWebUrl = computed(() => {
  if (!authState.value?.instanceUrl) return '#';
  return `${authState.value.instanceUrl}/vault`;
});

async function handleLogout() {
  await logout();
}
</script>

<template>
  <div class="flex flex-col h-full bg-slate-50 text-slate-800">
    <!-- Top Bar -->
    <div class="px-3 py-2 bg-white border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
      <button
        type="button"
        @click="emit('back')"
        class="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 p-1 -ml-1 rounded-md transition"
      >
        <ArrowLeft class="w-4 h-4" />
        <span>Vault</span>
      </button>
      <h2 class="text-xs font-bold text-slate-800">Settings</h2>
      <div class="w-8"></div>
    </div>

    <!-- Body -->
    <div class="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
      <!-- Connection Status Card -->
      <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connected Instance</span>
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
            <CheckCircle2 class="w-3 h-3 text-emerald-600" />
            Connected
          </span>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Server class="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span class="font-medium text-slate-900 truncate">{{ authState?.instanceUrl }}</span>
          </div>

          <div class="flex items-center gap-2">
            <User class="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span class="text-slate-700 truncate">
              {{ authState?.user }}
              <span v-if="authState?.fullName && authState?.fullName !== authState?.user" class="text-slate-400">
                ({{ authState?.fullName }})
              </span>
            </span>
          </div>

          <div class="flex items-center gap-2">
            <Shield class="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span class="text-slate-500">
              Auth Mode:
              <strong class="font-medium text-slate-700">
                {{ authState?.authType === 'token' ? 'API Token' : 'Session Login' }}
              </strong>
            </span>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100">
          <a
            :href="vaultWebUrl"
            target="_blank"
            class="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 text-blue-600 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <span>Open Frappe Vault Web App</span>
            <ExternalLink class="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <!-- About Frappe Vault -->
      <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <h3 class="text-xs font-bold text-slate-800">Frappe Vault Extension</h3>
        <p class="text-[11px] text-slate-500 leading-relaxed">
          Open source secrets and password manager built with WXT and Frappe UI, seamlessly integrated with Frappe Framework.
        </p>
        <div class="flex justify-between items-center pt-2 text-[11px] text-slate-400 border-t border-slate-100">
          <span>Version</span>
          <span>1.0.0</span>
        </div>
      </div>

      <!-- Disconnect / Logout Action -->
      <div class="pt-2">
        <button
          type="button"
          @click="handleLogout"
          class="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition flex items-center justify-center gap-2"
        >
          <LogOut class="w-4 h-4" />
          <span>Disconnect / Sign Out</span>
        </button>
      </div>
    </div>
  </div>
</template>
