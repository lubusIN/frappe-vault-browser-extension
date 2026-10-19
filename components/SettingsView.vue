<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useVaultAuth } from '../composables/useVaultAuth';
import { openExternalUrl } from '../utils/helpers';
import { getStoredSettings, setStoredSettings } from '../utils/storage';
import { Button, Badge, Switch, Dialog, Icon, useColorScheme } from 'frappe-ui';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const { authState, logout } = useVaultAuth();
const { colorScheme, resolvedColorScheme, setColorScheme } = useColorScheme();

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

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showSignOutConfirm.value) {
      showSignOutConfirm.value = false;
    } else {
      emit('back');
    }
  }
}

function handleSetTheme(scheme: 'system' | 'light' | 'dark') {
  setColorScheme(scheme);
  setStoredSettings({ theme: scheme });
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  try {
    const s = await getStoredSettings();
    settings.autoClearClipboard = s.clearClipboardAfterSeconds > 0;
    settings.autoFillCurrentTab = s.autoFillCurrentTab;
    if (s.theme && s.theme !== colorScheme.value) {
      setColorScheme(s.theme);
    }
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
      <h2 class="text-xs font-bold text-ink-gray-9">Settings</h2>
      <div class="w-8"></div>
    </div>

    <!-- Body (Espresso cards) -->
    <div class="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
      <!-- Connection Status Card -->
      <div
        class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-3"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-ink-gray-5"
            >Connected Instance</span
          >
          <Badge theme="green" size="sm" variant="subtle" label="Connected">
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
              <span
                v-if="authState?.fullName && authState?.fullName !== authState?.user"
                class="text-ink-gray-4"
              >
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

        <div class="pt-2 border-t border-outline-gray-1 space-y-2">
          <Button
            icon-right="lucide-external-link"
            label="Open Vault"
            size="sm"
            variant="subtle"
            class="w-full justify-center"
            @click="handleOpenVaultWeb"
          />
          <Button
            icon-left="lucide-log-out"
            label="Signout"
            size="sm"
            variant="subtle"
            theme="red"
            class="w-full justify-center"
            @click="showSignOutConfirm = true"
          />
        </div>
      </div>

      <!-- Appearance & Theme Card -->
      <div
        class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-2.5"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <Icon icon="lucide-palette" class="size-3.5 text-ink-gray-5" />
            <span class="text-[10px] font-bold uppercase tracking-wider text-ink-gray-5"
              >Appearance</span
            >
          </div>
          <span class="text-[11px] text-ink-gray-5 font-medium capitalize">
            {{ colorScheme === 'system' ? `System (${resolvedColorScheme})` : colorScheme }}
          </span>
        </div>

        <div
          class="grid grid-cols-3 gap-1 bg-surface-gray-2 p-1 rounded-4 border border-outline-gray-1"
        >
          <button
            type="button"
            class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-3 text-xs font-medium transition cursor-pointer"
            :class="
              colorScheme === 'system'
                ? 'bg-surface-base text-ink-gray-9 shadow-2xs font-semibold'
                : 'text-ink-gray-6 hover:text-ink-gray-9 hover:bg-surface-gray-3/50'
            "
            @click="handleSetTheme('system')"
          >
            <Icon icon="lucide-laptop" class="size-3.5" />
            <span>System</span>
          </button>

          <button
            type="button"
            class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-3 text-xs font-medium transition cursor-pointer"
            :class="
              colorScheme === 'light'
                ? 'bg-surface-base text-ink-gray-9 shadow-2xs font-semibold'
                : 'text-ink-gray-6 hover:text-ink-gray-9 hover:bg-surface-gray-3/50'
            "
            @click="handleSetTheme('light')"
          >
            <Icon icon="lucide-sun" class="size-3.5" />
            <span>Light</span>
          </button>

          <button
            type="button"
            class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-3 text-xs font-medium transition cursor-pointer"
            :class="
              colorScheme === 'dark'
                ? 'bg-surface-base text-ink-gray-9 shadow-2xs font-semibold'
                : 'text-ink-gray-6 hover:text-ink-gray-9 hover:bg-surface-gray-3/50'
            "
            @click="handleSetTheme('dark')"
          >
            <Icon icon="lucide-moon" class="size-3.5" />
            <span>Dark</span>
          </button>
        </div>
      </div>

      <!-- Security & Preferences (Using Frappe UI Switch) -->
      <div
        class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-3"
      >
        <div class="flex items-center gap-1.5">
          <Icon icon="lucide-lock" class="size-3.5 text-ink-gray-5" />
          <span class="text-[10px] font-bold uppercase tracking-wider text-ink-gray-5"
            >Security & Preferences</span
          >
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
            label="In-page autofill suggestions"
            description="Show vault credential dropdown directly on website login inputs"
          />
        </div>
      </div>
    </div>

    <!-- Sign Out Confirmation Dialog using Frappe UI Dialog -->
    <Dialog
      v-model="showSignOutConfirm"
      title="Signout from Vault?"
      message="You will be signed out of this Frappe Vault instance. You will need to sign in again to access your credentials."
      theme="red"
      size="xs"
      :actions="[
        {
          label: 'Signout',
          theme: 'red',
          variant: 'solid',
          loading: isLoggingOut,
          onClick: () => handleConfirmLogout(),
        },
      ]"
    />
  </div>
</template>
