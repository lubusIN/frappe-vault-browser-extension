<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { openExternalUrl } from '../utils/helpers';
import VaultIcon from './VaultIcon.vue';
import GithubIcon from './GithubIcon.vue';
import { Button, Badge, Icon } from 'frappe-ui';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const extensionVersion = computed(() => {
  const g = globalThis as any;
  return (
    g.browser?.runtime?.getManifest?.()?.version ||
    g.chrome?.runtime?.getManifest?.()?.version ||
    '1.0.0'
  );
});

function handleOpenVaultApp() {
  openExternalUrl('https://github.com/lubusIN/frappe-vault');
}

function handleOpenExtensionRepo() {
  openExternalUrl('https://github.com/lubusIN/vault-browser-extention');
}

function handleOpenIssues() {
  openExternalUrl('https://github.com/lubusIN/vault-browser-extention/issues');
}

function handleOpenLubus() {
  openExternalUrl('https://github.com/lubusIN/');
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('back');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div class="flex flex-col h-full bg-surface-gray-2 text-ink-gray-9">
    <!-- Top Bar (Espresso Appbar) -->
    <div
      class="px-3 py-2 bg-surface-base border-b border-outline-gray-2 flex items-center justify-between flex-shrink-0"
    >
      <Button
        icon="lucide-arrow-left"
        size="sm"
        variant="ghost"
        tooltip="Back"
        @click="emit('back')"
      />
      <h2 class="text-xs font-bold text-ink-gray-9">About</h2>
      <div class="w-8"></div>
    </div>

    <!-- Body (Espresso cards) -->
    <div class="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
      <!-- App Identity Hero Card -->
      <div
        class="bg-surface-base p-4 rounded-6 border border-outline-gray-2 shadow-elevation-1 flex flex-col items-center text-center space-y-2"
      >
        <VaultIcon size="size-12" class="rounded-4 shadow-elevation-2" />
        <div class="space-y-0.5">
          <h1 class="text-sm font-bold text-ink-gray-9 tracking-tight">Frappe Vault</h1>
          <p class="text-[11px] text-ink-gray-5">Browser Extension</p>
        </div>
        <Badge size="sm" variant="subtle" theme="gray" :label="`v${extensionVersion}`" />
        <p class="text-[11px] text-ink-gray-6 leading-relaxed pt-1">
          Open-source password and secrets manager.
        </p>
      </div>

      <!-- Navigation & Links Card -->
      <div
        class="bg-surface-base rounded-6 border border-outline-gray-2 shadow-elevation-1 divide-y divide-outline-gray-1 overflow-hidden"
      >
        <!-- Main Frappe Vault App Repo -->
        <button
          type="button"
          class="w-full p-3 flex items-center justify-between hover:bg-surface-gray-1 transition text-left cursor-pointer"
          @click="handleOpenVaultApp"
        >
          <div class="flex items-center gap-2.5">
            <GithubIcon class="size-4 text-ink-gray-7" />
            <div>
              <div class="font-medium text-ink-gray-9">Frappe Vault App</div>
              <div class="text-[10px] text-ink-gray-5">github.com/lubusIN/frappe-vault</div>
            </div>
          </div>
          <Icon icon="lucide-external-link" class="size-3.5 text-ink-gray-4" />
        </button>

        <!-- Vault Browser Extension Repo -->
        <button
          type="button"
          class="w-full p-3 flex items-center justify-between hover:bg-surface-gray-1 transition text-left cursor-pointer"
          @click="handleOpenExtensionRepo"
        >
          <div class="flex items-center gap-2.5">
            <GithubIcon class="size-4 text-ink-gray-7" />
            <div>
              <div class="font-medium text-ink-gray-9">Vault Browser Extension</div>
              <div class="text-[10px] text-ink-gray-5">
                github.com/lubusIN/vault-browser-extention
              </div>
            </div>
          </div>
          <Icon icon="lucide-external-link" class="size-3.5 text-ink-gray-4" />
        </button>

        <!-- Report Issue -->
        <button
          type="button"
          class="w-full p-3 flex items-center justify-between hover:bg-surface-gray-1 transition text-left cursor-pointer"
          @click="handleOpenIssues"
        >
          <div class="flex items-center gap-2.5">
            <Icon icon="lucide-bug" class="size-4 text-ink-gray-7" />
            <div>
              <div class="font-medium text-ink-gray-9">Report an Issue</div>
              <div class="text-[10px] text-ink-gray-5">Submit bugs or feature requests</div>
            </div>
          </div>
          <Icon icon="lucide-external-link" class="size-3.5 text-ink-gray-4" />
        </button>
      </div>

      <!-- Legal & Credit Info -->
      <div
        class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-2 text-[11px] text-ink-gray-5"
      >
        <div class="flex justify-between items-center">
          <span>License</span>
          <span class="font-medium text-ink-gray-7">Open Source (MIT)</span>
        </div>
        <div class="border-t border-outline-gray-1"></div>
        <div class="flex justify-between items-center">
          <span>Maintained by</span>
          <button
            type="button"
            class="font-medium text-ink-gray-7 hover:text-ink-gray-9 hover:underline inline-flex items-center gap-1 cursor-pointer transition"
            @click="handleOpenLubus"
          >
            <span>LUBUS</span>
            <Icon icon="lucide-external-link" class="size-3 text-ink-gray-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
