<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useVaultAuth } from '../composables/useVaultAuth';
import { openExternalUrl } from '../utils/helpers';
import { getStoredSettings, setStoredSettings } from '../utils/storage';
import { Button, Badge, Switch, Dialog, Icon } from 'frappe-ui';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const { authState, logout } = useVaultAuth();

const vaultWebUrl = computed(() => {
  if (!authState.value?.instanceUrl) return '#';
  return `${authState.value.instanceUrl}/vault`;
});

// Security & Autofill settings
const settings = reactive({
  autoClearClipboard: true,
  autoHideCredentials: true,
  autoFillCurrentTab: true,
});

// Logout confirmation dialog
const showSignOutConfirm = ref(false);
const isLoggingOut = ref(false);

function handleOpenVaultWeb() {
  openExternalUrl(vaultWebUrl.value);
}

function handleOpenGithub() {
  openExternalUrl('https://github.com/lubusIN/frappe-vault');
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showSignOutConfirm.value) {
      showSignOutConfirm.value = false;
    } else {
      emit('back');
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  try {
    const s = await getStoredSettings();
    settings.autoClearClipboard = s.clearClipboardAfterSeconds > 0;
    settings.autoFillCurrentTab = s.autoFillCurrentTab;
  } catch {}
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

// Watch settings and persist to extension storage
watch(settings, async (newVal) => {
  try {
    await setStoredSettings({
      autoFillCurrentTab: newVal.autoFillCurrentTab,
      clearClipboardAfterSeconds: newVal.autoClearClipboard ? 30 : 0,
    });
  } catch {}
});

async function handleConfirmLogout() {
  isLoggingOut.value = true;
  try {
    await logout();
  } finally {
    isLoggingOut.value = false;
    showSignOutConfirm.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-surface-gray-2 text-ink-gray-9">
    <!-- Top Bar (Espresso Appbar) -->
    <div class="px-3 py-2 bg-surface-base border-b border-outline-gray-2 flex items-center justify-between flex-shrink-0">
      <Button
        icon-left="lucide-arrow-left"
        label="Vault"
        size="sm"
        variant="ghost"
        @click="emit('back')"
      />
      <h2 class="text-xs font-bold text-ink-gray-9">Settings</h2>
      <div class="w-8"></div>
    </div>

    <!-- Body (Espresso cards) -->
    <div class="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
      <!-- Connection Status Card -->
      <div class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-ink-gray-5">Connected Instance</span>
          <Badge
            theme="green"
            size="sm"
            variant="subtle"
            label="Connected"
          >
            <template #prefix>
              <Icon icon="lucide-check-circle-2" class="size-3 text-ink-green-7" />
            </template>
          </Badge>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Icon icon="lucide-server" class="size-4 text-ink-gray-4 flex-shrink-0" />
            <span class="font-medium text-ink-gray-9 truncate">{{ authState?.instanceUrl }}</span>
          </div>

          <div class="flex items-center gap-2">
            <Icon icon="lucide-user" class="size-4 text-ink-gray-4 flex-shrink-0" />
            <span class="text-ink-gray-7 truncate">
              {{ authState?.user }}
              <span v-if="authState?.fullName && authState?.fullName !== authState?.user" class="text-ink-gray-4">
                ({{ authState?.fullName }})
              </span>
            </span>
          </div>

          <div class="flex items-center gap-2">
            <Icon icon="lucide-shield" class="size-4 text-ink-gray-4 flex-shrink-0" />
            <span class="text-ink-gray-5">
              Auth Mode:
              <strong class="font-medium text-ink-gray-7">
                {{ authState?.authType === 'token' ? 'API Token' : 'Session Login' }}
              </strong>
            </span>
          </div>
        </div>

        <div class="pt-2 border-t border-outline-gray-1">
          <Button
            icon-right="lucide-external-link"
            label="Open Frappe Vault Web App"
            size="sm"
            variant="subtle"
            class="w-full justify-center"
            @click="handleOpenVaultWeb"
          />
        </div>
      </div>

      <!-- Security & Preferences (Using Frappe UI Switch) -->
      <div class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-3">
        <div class="flex items-center gap-1.5">
          <Icon icon="lucide-lock" class="size-3.5 text-ink-gray-5" />
          <span class="text-[10px] font-bold uppercase tracking-wider text-ink-gray-5">Security & Preferences</span>
        </div>

        <div class="space-y-3 pt-1">
          <Switch
            v-model="settings.autoClearClipboard"
            size="sm"
            label="Auto-clear clipboard"
            description="Clear copied credentials from clipboard after 30 seconds"
          />

          <div class="border-t border-outline-gray-1"></div>

          <Switch
            v-model="settings.autoHideCredentials"
            size="sm"
            label="Auto-hide credentials"
            description="Mask revealed passwords and keys after 30 seconds"
          />

          <div class="border-t border-outline-gray-1"></div>

          <Switch
            v-model="settings.autoFillCurrentTab"
            size="sm"
            label="Match active website"
            description="Suggest credentials matching the active browser tab"
          />
        </div>
      </div>

      <!-- About Frappe Vault -->
      <div class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-2.5">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-ink-gray-9">Frappe Vault Extension</h3>
          <Badge size="sm" variant="subtle" label="v1.0.0" />
        </div>
        <p class="text-[11px] text-ink-gray-5 leading-relaxed">
          Open source browser extension using Frappe UI and the Espresso design system.
        </p>
        <div class="flex justify-between items-center pt-2 text-[11px] text-ink-gray-7 border-t border-outline-gray-1">
          <span>Source Code</span>
          <Button
            icon-left="lucide-git-branch"
            label="GitHub"
            size="xs"
            variant="ghost"
            @click="handleOpenGithub"
          />
        </div>
      </div>

      <!-- Disconnect / Logout Action -->
      <div class="pt-1">
        <Button
          icon-left="lucide-log-out"
          label="Disconnect / Sign Out"
          size="md"
          variant="subtle"
          theme="red"
          class="w-full justify-center"
          @click="showSignOutConfirm = true"
        />
      </div>
    </div>

    <!-- Sign Out Confirmation Dialog using Frappe UI Dialog -->
    <Dialog
      v-model="showSignOutConfirm"
      title="Disconnect from Vault?"
      message="You will be signed out of this Frappe Vault instance. You will need to sign in again to access your credentials."
      theme="red"
      size="xs"
      :actions="[
        {
          label: 'Disconnect',
          theme: 'red',
          variant: 'solid',
          loading: isLoggingOut,
          onClick: () => handleConfirmLogout(),
        },
      ]"
    />
  </div>
</template>
