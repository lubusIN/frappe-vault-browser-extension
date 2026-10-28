<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useVaultAuth } from '../composables/useVaultAuth';
import { openExternalUrl, copyText } from '../utils/helpers';
import { getStoredSettings, setStoredSettings } from '../utils/storage';
import VaultIcon from './VaultIcon.vue';
import GithubIcon from './GithubIcon.vue';
import {
  Avatar,
  Button,
  Badge,
  Switch,
  Dialog,
  Icon,
  TabButtons,
  KeyboardShortcut,
  useColorScheme,
} from 'frappe-ui';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'open-about'): void;
}>();

type SettingsTab = 'general' | 'connection' | 'shortcuts' | 'about';

const props = withDefaults(
  defineProps<{
    initialTab?: SettingsTab;
  }>(),
  {
    initialTab: 'general',
  }
);

const { authState, logout } = useVaultAuth();
const { colorScheme, resolvedColorScheme, setColorScheme } = useColorScheme();

const activeTab = ref<SettingsTab>(props.initialTab);

const tabOptions = [
  { label: 'General', value: 'general' },
  { label: 'Connection', value: 'connection' },
  { label: 'Shortcuts', value: 'shortcuts' },
  { label: 'About', value: 'about' },
];

const vaultWebUrl = computed(() => {
  if (!authState.value?.instanceUrl) return '#';
  return `${authState.value.instanceUrl}/vault`;
});

const themeOptions = [
  { label: 'System', value: 'system', iconLeft: 'lucide-laptop' },
  { label: 'Light', value: 'light', iconLeft: 'lucide-sun' },
  { label: 'Dark', value: 'dark', iconLeft: 'lucide-moon' },
];

// Security & Autofill settings
const settings = reactive({
  autoClearClipboard: true,
  autoHideCredentials: true,
  autoFillCurrentTab: true,
});

// Logout confirmation dialog & copy states
const showSignOutConfirm = ref(false);
const isLoggingOut = ref(false);
const isUrlCopied = ref(false);
const isUserCopied = ref(false);

const extensionVersion = computed(() => {
  const g = globalThis as any;
  return (
    g.browser?.runtime?.getManifest?.()?.version ||
    g.chrome?.runtime?.getManifest?.()?.version ||
    '1.0.0'
  );
});

function handleOpenVaultWeb() {
  openExternalUrl(vaultWebUrl.value);
}

function handleOpenVaultApp() {
  openExternalUrl('https://github.com/lubusIN/frappe-vault');
}

function handleOpenExtensionRepo() {
  openExternalUrl('https://github.com/lubusIN/frappe-vault-browser-extension');
}

function handleOpenIssues() {
  openExternalUrl('https://github.com/lubusIN/frappe-vault-browser-extension/issues');
}

function handleOpenLubus() {
  openExternalUrl('https://github.com/lubusIN/');
}

function handleOpenShortcutsPage() {
  const g = globalThis as any;
  if (g.chrome?.tabs?.create) {
    g.chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  } else if (g.browser?.tabs?.create) {
    g.browser.tabs.create({ url: 'about:addons' });
  } else {
    openExternalUrl('chrome://extensions/shortcuts');
  }
}

async function handleCopyInstanceUrl() {
  if (!authState.value?.instanceUrl) return;
  const ok = await copyText(authState.value.instanceUrl, 0);
  if (ok) {
    isUrlCopied.value = true;
    setTimeout(() => {
      isUrlCopied.value = false;
    }, 2000);
  }
}

async function handleCopyUser() {
  if (!authState.value?.user) return;
  const ok = await copyText(authState.value.user, 0);
  if (ok) {
    isUserCopied.value = true;
    setTimeout(() => {
      isUserCopied.value = false;
    }, 2000);
  }
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
      <Button
        icon="lucide-external-link"
        size="sm"
        variant="ghost"
        tooltip="Open Web Vault"
        @click="handleOpenVaultWeb"
      />
    </div>

    <!-- Category Segmented Navigation (Espresso TabButtons) -->
    <div class="px-3 py-2 bg-surface-base border-b border-outline-gray-2 flex-shrink-0">
      <TabButtons v-model="activeTab" :options="tabOptions" variant="subtle" size="sm" fluid />
    </div>

    <!-- Tab Panels Container -->
    <div class="flex-1 p-3.5 overflow-y-auto text-xs">
      <!-- 1. GENERAL / PREFERENCES TAB -->
      <div v-show="activeTab === 'general'" class="space-y-3">
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

          <div class="pt-1">
            <TabButtons
              :model-value="colorScheme"
              :options="themeOptions"
              variant="subtle"
              size="sm"
              fluid
              @update:model-value="(val) => handleSetTheme(val as 'system' | 'light' | 'dark')"
            />
          </div>
        </div>

        <!-- Preferences & Behavior Card -->
        <div
          class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-3"
        >
          <div class="flex items-center gap-1.5">
            <Icon icon="lucide-sliders-horizontal" class="size-3.5 text-ink-gray-5" />
            <span class="text-[10px] font-bold uppercase tracking-wider text-ink-gray-5"
              >Preferences</span
            >
          </div>

          <div class="space-y-3 pt-1">
            <Switch
              v-model="settings.autoClearClipboard"
              size="sm"
              label="Auto-clear clipboard"
              description="Clear clipboard after 30s"
            />

            <div class="border-t border-outline-gray-1"></div>

            <Switch
              v-model="settings.autoHideCredentials"
              size="sm"
              label="Auto-hide credentials"
              description="Mask revealed secrets after 30s"
            />

            <div class="border-t border-outline-gray-1"></div>

            <Switch
              v-model="settings.autoFillCurrentTab"
              size="sm"
              label="In-page autofill"
              description="Suggest credentials on web forms"
            />
          </div>
        </div>
      </div>

      <!-- 2. CONNECTION TAB -->
      <div v-show="activeTab === 'connection'" class="space-y-3">
        <!-- Connected Instance Card -->
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

          <!-- Clean Divided Property Rows -->
          <div class="divide-y divide-outline-gray-1 text-xs">
            <!-- Server Row -->
            <div class="py-2.5 flex items-center justify-between first:pt-1">
              <div class="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  class="size-7 rounded-full bg-surface-gray-2 flex items-center justify-center flex-shrink-0"
                >
                  <Icon icon="lucide-server" class="size-3.5 text-ink-gray-6" />
                </div>
                <div class="min-w-0">
                  <div class="text-[10px] text-ink-gray-4 uppercase font-bold tracking-wider">
                    Vault Server
                  </div>
                  <div class="font-medium text-ink-gray-9 truncate">
                    {{ authState?.instanceUrl }}
                  </div>
                </div>
              </div>
              <Button
                size="xs"
                variant="ghost"
                :icon="isUrlCopied ? 'lucide-check' : 'lucide-copy'"
                :tooltip="isUrlCopied ? 'Copied' : 'Copy Server URL'"
                @click="handleCopyInstanceUrl"
              />
            </div>

            <!-- User Account Row with Copy -->
            <div class="py-2.5 flex items-center justify-between">
              <div class="flex items-center gap-2.5 min-w-0 pr-2">
                <Avatar
                  :label="authState?.fullName || authState?.user || 'U'"
                  size="sm"
                  shape="circle"
                  theme="gray"
                  class="flex-shrink-0"
                />
                <div class="min-w-0">
                  <div class="text-[10px] text-ink-gray-4 uppercase font-bold tracking-wider">
                    User Account
                  </div>
                  <div class="font-medium text-ink-gray-9 truncate">
                    {{ authState?.user }}
                    <span
                      v-if="authState?.fullName && authState?.fullName !== authState?.user"
                      class="text-ink-gray-5 font-normal ml-1"
                    >
                      ({{ authState?.fullName }})
                    </span>
                  </div>
                </div>
              </div>
              <Button
                size="xs"
                variant="ghost"
                :icon="isUserCopied ? 'lucide-check' : 'lucide-copy'"
                :tooltip="isUserCopied ? 'Copied' : 'Copy User Account'"
                @click="handleCopyUser"
              />
            </div>

            <!-- Auth Mode Row -->
            <div class="py-2.5 flex items-center justify-between last:pb-1">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="size-7 rounded-full bg-surface-gray-2 flex items-center justify-center flex-shrink-0"
                >
                  <Icon icon="lucide-shield-check" class="size-3.5 text-ink-gray-6" />
                </div>
                <div class="min-w-0">
                  <div class="text-[10px] text-ink-gray-4 uppercase font-bold tracking-wider">
                    Auth Mode
                  </div>
                  <div class="font-medium text-ink-gray-9">
                    {{
                      authState?.authType === 'token'
                        ? 'API Token Authentication'
                        : 'Session Login Authentication'
                    }}
                  </div>
                </div>
              </div>
              <Badge
                size="sm"
                variant="subtle"
                :theme="authState?.authType === 'token' ? 'blue' : 'gray'"
                :label="authState?.authType === 'token' ? 'Token' : 'Session'"
              />
            </div>
          </div>

          <!-- Open Vault & Signout in a Single Row -->
          <div class="pt-3 border-t border-outline-gray-1 flex items-center gap-2">
            <Button
              icon-right="lucide-external-link"
              label="Open Vault"
              size="sm"
              variant="subtle"
              class="flex-1 justify-center"
              @click="handleOpenVaultWeb"
            />
            <Button
              icon-left="lucide-log-out"
              label="Signout"
              size="sm"
              variant="subtle"
              theme="red"
              class="flex-1 justify-center"
              @click="showSignOutConfirm = true"
            />
          </div>
        </div>
      </div>

      <!-- 3. KEYBOARD SHORTCUTS TAB -->
      <div v-show="activeTab === 'shortcuts'" class="space-y-3">
        <!-- Shortcuts Directory Card -->
        <div
          class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <Icon icon="lucide-keyboard" class="size-3.5 text-ink-gray-5" />
              <span class="text-[10px] font-bold uppercase tracking-wider text-ink-gray-5"
                >Keyboard Shortcuts</span
              >
            </div>
            <Badge size="sm" variant="subtle" theme="blue" label="Productivity" />
          </div>

          <div class="divide-y divide-outline-gray-1 text-[11px]">
            <div class="py-2.5 flex items-center justify-between first:pt-1">
              <div>
                <div class="font-medium text-ink-gray-9">Open Frappe Vault</div>
                <div class="text-[10px] text-ink-gray-4">Toggle extension popup anytime</div>
              </div>
              <KeyboardShortcut combo="Mod+Shift+Y" bg />
            </div>

            <div class="py-2.5 flex items-center justify-between">
              <div>
                <div class="font-medium text-ink-gray-9">Auto-fill page</div>
                <div class="text-[10px] text-ink-gray-4">Fill matching account on active tab</div>
              </div>
              <KeyboardShortcut combo="Mod+Shift+L" bg />
            </div>

            <div class="py-2.5 flex items-center justify-between">
              <div>
                <div class="font-medium text-ink-gray-9">Focus search</div>
                <div class="text-[10px] text-ink-gray-4">Quick search across all vault secrets</div>
              </div>
              <div class="flex items-center gap-1.5">
                <KeyboardShortcut combo="Mod+K" bg />
                <span class="text-ink-gray-4 text-[10px]">or</span>
                <KeyboardShortcut combo="/" bg />
              </div>
            </div>

            <div class="py-2.5 flex items-center justify-between">
              <div>
                <div class="font-medium text-ink-gray-9">New secret</div>
                <div class="text-[10px] text-ink-gray-4">Open new secret form directly</div>
              </div>
              <KeyboardShortcut combo="N" bg />
            </div>

            <div class="py-2.5 flex items-center justify-between last:pb-1">
              <div>
                <div class="font-medium text-ink-gray-9">Go back / Dismiss</div>
                <div class="text-[10px] text-ink-gray-4">Close dialog or return to list view</div>
              </div>
              <KeyboardShortcut combo="Escape" bg />
            </div>
          </div>
        </div>

        <!-- Customizing Browser Hotkeys Card -->
        <div
          class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-2.5"
        >
          <div class="flex items-start gap-2">
            <Icon icon="lucide-info" class="size-4 text-ink-gray-5 flex-shrink-0 mt-0.5" />
            <div class="text-[11px] text-ink-gray-6 leading-relaxed">
              Global system shortcuts can be remapped directly in your browser's extension settings.
            </div>
          </div>

          <Button
            size="xs"
            variant="subtle"
            icon-right="lucide-external-link"
            label="Configure Browser Shortcuts"
            class="w-full justify-center"
            @click="handleOpenShortcutsPage"
          />
        </div>
      </div>

      <!-- 4. ABOUT TAB -->
      <div v-show="activeTab === 'about'" class="space-y-3">
        <!-- App Identity Hero Card -->
        <div
          class="bg-surface-base p-4 rounded-6 border border-outline-gray-2 shadow-elevation-1 flex flex-col items-center text-center space-y-2"
        >
          <VaultIcon size="size-11" class="rounded-4 shadow-elevation-2" />
          <div class="space-y-0.5">
            <h1 class="text-sm font-bold text-ink-gray-9 tracking-tight">Frappe Vault</h1>
            <p class="text-[11px] text-ink-gray-5">Browser Extension</p>
          </div>
          <Badge size="sm" variant="subtle" theme="gray" :label="`v${extensionVersion}`" />
          <p class="text-[11px] text-ink-gray-6 leading-relaxed pt-0.5 max-w-[260px]">
            Open-source password and secrets manager.
          </p>
        </div>

        <!-- Navigation & Links Card -->
        <div
          class="bg-surface-base rounded-6 border border-outline-gray-2 shadow-elevation-1 divide-y divide-outline-gray-1 overflow-hidden"
        >
          <button
            type="button"
            class="w-full p-2.5 flex items-center justify-between hover:bg-surface-gray-1 transition text-left cursor-pointer"
            @click="handleOpenVaultApp"
          >
            <div class="flex items-center gap-2.5">
              <GithubIcon class="size-4 text-ink-gray-7" />
              <div>
                <div class="font-medium text-ink-gray-9">Web App</div>
                <div class="text-[10px] text-ink-gray-5">github.com/lubusIN/frappe-vault</div>
              </div>
            </div>
            <Icon icon="lucide-external-link" class="size-3.5 text-ink-gray-4" />
          </button>

          <button
            type="button"
            class="w-full p-2.5 flex items-center justify-between hover:bg-surface-gray-1 transition text-left cursor-pointer"
            @click="handleOpenExtensionRepo"
          >
            <div class="flex items-center gap-2.5">
              <GithubIcon class="size-4 text-ink-gray-7" />
              <div>
                <div class="font-medium text-ink-gray-9">Browser Extension</div>
                <div class="text-[10px] text-ink-gray-5">
                  github.com/lubusIN/frappe-vault-browser-extension
                </div>
              </div>
            </div>
            <Icon icon="lucide-external-link" class="size-3.5 text-ink-gray-4" />
          </button>

          <button
            type="button"
            class="w-full p-2.5 flex items-center justify-between hover:bg-surface-gray-1 transition text-left cursor-pointer"
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
          class="bg-surface-base p-3 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-2 text-[11px] text-ink-gray-5"
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
