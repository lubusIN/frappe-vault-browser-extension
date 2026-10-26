<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useVaultApi } from '../composables/useVaultApi';
import { useVaultAuth } from '../composables/useVaultAuth';
import { useActiveTab } from '../composables/useActiveTab';
import type { VaultSecretDetail, TotpResult } from '../types/vault';
import SecretTypeIcon from './SecretTypeIcon.vue';
import SecretFieldRow from './SecretFieldRow.vue';
import BookmarkIcon from './BookmarkIcon.vue';
import { copyText, formatRelativeTime, openExternalUrl } from '../utils/helpers';
import { getStoredSecretsCache, setStoredSecretsCache } from '../utils/storage';
import { cachedSecrets, cachedTotal } from '../composables/useVaultSecrets';
import { Button, Badge, Spinner, Dialog, Progress, Icon } from 'frappe-ui';

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'deleted', name: string): void;
}>();

const props = defineProps<{
  secretName: string;
}>();

const { getSecret, decryptSecret, getTotp, toggleBookmark, deleteSecret } = useVaultApi();
const { authState } = useVaultAuth();
const { autofillCredentials } = useActiveTab();

const secret = ref<VaultSecretDetail | null>(null);
const isLoading = ref(true);
const isDecrypting = ref(false);
const error = ref<string | null>(null);

// Visibility toggles for sensitive fields
const showPassword = ref(false);
const showApiSecret = ref(false);
const showCardNumber = ref(false);
const showCardCvv = ref(false);
const showDbPassword = ref(false);
const showSshKey = ref(false);

// Auto-hide security timer for revealed secrets
let autoHideTimer: any = null;
function scheduleAutoHide() {
  if (autoHideTimer) clearTimeout(autoHideTimer);
  autoHideTimer = setTimeout(() => {
    showPassword.value = false;
    showApiSecret.value = false;
    showCardNumber.value = false;
    showCardCvv.value = false;
    showDbPassword.value = false;
    showSshKey.value = false;
  }, 30000); // 30s auto-hide timeout
}

// Copied indicators map
const copiedField = ref<string | null>(null);
const autofillStatus = ref<'idle' | 'success' | 'failed'>('idle');

// Delete dialog confirmation
const showDeleteConfirm = ref(false);
const isDeleting = ref(false);

// TOTP live state
const totpData = ref<TotpResult | null>(null);
let totpTimer: any = null;

async function loadSecret() {
  isLoading.value = true;
  error.value = null;
  try {
    // 1. Fetch secret details with decrypt=true so decrypted data is ready immediately
    const data = await getSecret(props.secretName, true);
    secret.value = data;

    if (data.has_totp) {
      fetchLiveTotp();
      startTotpCountdown();
    }
  } catch (err: any) {
    // 2. If decrypt fails (e.g. view-only permissions), fallback to decrypt=false
    try {
      const data = await getSecret(props.secretName, false);
      secret.value = data;
      if (data.has_totp) {
        fetchLiveTotp();
        startTotpCountdown();
      }
    } catch (fallbackErr: any) {
      error.value = fallbackErr.message || err.message || 'Failed to load secret details';
    }
  } finally {
    isLoading.value = false;
  }
}

async function ensureDecrypted(): Promise<boolean> {
  if (secret.value?.decrypted && Object.keys(secret.value.decrypted).length > 0) return true;
  isDecrypting.value = true;
  try {
    const full = await decryptSecret(props.secretName);
    if (secret.value && full) {
      secret.value.decrypted = full.decrypted || (full as any);
      return true;
    }
  } catch (err: any) {
    console.error('Decryption failed:', err);
  } finally {
    isDecrypting.value = false;
  }
  return false;
}

async function toggleReveal(
  field: 'password' | 'apiSecret' | 'cardNumber' | 'cardCvv' | 'dbPassword' | 'sshKey'
) {
  const map = {
    password: showPassword,
    apiSecret: showApiSecret,
    cardNumber: showCardNumber,
    cardCvv: showCardCvv,
    dbPassword: showDbPassword,
    sshKey: showSshKey,
  };

  const target = map[field];
  if (target.value) {
    target.value = false;
    return;
  }

  const ok = await ensureDecrypted();
  if (ok || secret.value?.decrypted) {
    target.value = true;
    scheduleAutoHide();
  }
}

async function handleCopy(fieldKey: string, immediateText?: string | null) {
  let text = immediateText;

  if (!text) {
    await ensureDecrypted();
    const d = secret.value?.decrypted;
    if (fieldKey === 'password') text = d?.password;
    else if (fieldKey === 'api_secret') text = d?.api_secret;
    else if (fieldKey === 'card_number') text = d?.card_number;
    else if (fieldKey === 'card_cvv') text = d?.card_cvv;
    else if (fieldKey === 'db_password') text = d?.db_password;
    else if (fieldKey === 'ssh_private_key')
      text = d?.ssh_private_key || secret.value?.ssh_private_key;
    else if (fieldKey === 'totp') text = totpData.value?.code;
  }

  if (!text) return;

  const ok = await copyText(text, 30);
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
    await ensureDecrypted();
    pwd = secret.value?.decrypted?.password;
  }

  const ok = await autofillCredentials(
    secret.value?.username || secret.value?.email || '',
    pwd || ''
  );
  autofillStatus.value = ok ? 'success' : 'failed';
  setTimeout(() => {
    autofillStatus.value = 'idle';
  }, 3000);
}

async function handleToggleBookmark() {
  if (!secret.value) return;
  const previousState = secret.value.is_bookmark ? 1 : 0;
  const newState = previousState ? 0 : 1;

  // Optimistic update
  secret.value = { ...secret.value, is_bookmark: newState };
  cachedSecrets.value = cachedSecrets.value.map((s) =>
    s.name === secret.value!.name ? { ...s, is_bookmark: newState } : s
  );

  try {
    const res = await toggleBookmark(secret.value.name);
    const confirmedState =
      res && res.is_bookmark !== undefined ? (res.is_bookmark ? 1 : 0) : newState;
    secret.value = { ...secret.value, is_bookmark: confirmedState };
    cachedSecrets.value = cachedSecrets.value.map((s) =>
      s.name === secret.value!.name ? { ...s, is_bookmark: confirmedState } : s
    );
    const cached = await getStoredSecretsCache();
    if (cached && Array.isArray(cached.secrets)) {
      const updatedSecrets = cached.secrets.map((s) =>
        s.name === secret.value!.name ? { ...s, is_bookmark: confirmedState } : s
      );
      await setStoredSecretsCache({ ...cached, secrets: updatedSecrets });
    }
  } catch (err) {
    console.error('Failed to toggle bookmark in detail view:', err);
    secret.value = { ...secret.value, is_bookmark: previousState };
    cachedSecrets.value = cachedSecrets.value.map((s) =>
      s.name === secret.value!.name ? { ...s, is_bookmark: previousState } : s
    );
  }
}

async function handleDelete() {
  if (!secret.value) return;
  isDeleting.value = true;
  try {
    await deleteSecret(secret.value.name);
    cachedSecrets.value = cachedSecrets.value.filter((s) => s.name !== secret.value!.name);
    cachedTotal.value = Math.max(0, cachedTotal.value - 1);
    const cached = await getStoredSecretsCache();
    if (cached && Array.isArray(cached.secrets)) {
      await setStoredSecretsCache({
        ...cached,
        secrets: cached.secrets.filter((s) => s.name !== secret.value!.name),
        total: Math.max(0, cached.total - 1),
      });
    }
    emit('deleted', secret.value.name);
    emit('back');
  } catch (err: any) {
    error.value = err.message || 'Failed to delete secret';
  } finally {
    isDeleting.value = false;
    showDeleteConfirm.value = false;
  }
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

const formattedTotpCode = computed(() => {
  const code = totpData.value?.code;
  if (!code || code.length !== 6) return code || '••••••';
  return `${code.slice(0, 3)} ${code.slice(3)}`;
});

const totpProgressPercent = computed(() => {
  const remaining = totpData.value?.remaining_seconds ?? 30;
  return Math.round((remaining / 30) * 100);
});

const isTotpExpiringSoon = computed(() => {
  return (totpData.value?.remaining_seconds ?? 30) <= 5;
});

const openInVaultUrl = computed(() => {
  if (!authState.value?.instanceUrl || !secret.value?.name) return '#';
  return `${authState.value.instanceUrl}/vault/secrets/${secret.value.name}`;
});

function handleOpenVaultUrl() {
  openExternalUrl(openInVaultUrl.value);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showDeleteConfirm.value) {
      showDeleteConfirm.value = false;
    } else {
      emit('back');
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  loadSecret();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  clearInterval(totpTimer);
  if (autoHideTimer) clearTimeout(autoHideTimer);
});
</script>

<template>
  <div class="flex flex-col h-full bg-surface-gray-2 text-ink-gray-9">
    <!-- Top Action Bar -->
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

      <div class="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          :tooltip="secret?.is_bookmark ? 'Remove from bookmarks' : 'Add to bookmarks'"
          @click.stop="handleToggleBookmark"
        >
          <template #icon>
            <BookmarkIcon
              :filled="Boolean(secret?.is_bookmark)"
              class="size-4 transition-colors"
              :class="
                secret?.is_bookmark ? 'text-amber-500' : 'text-ink-gray-4 hover:text-amber-500'
              "
            />
          </template>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon="lucide-pencil"
          label="Edit in Vault"
          tooltip="Open in Frappe Vault to edit"
          @click="handleOpenVaultUrl"
        />
        <Button
          size="sm"
          variant="ghost"
          theme="red"
          icon="lucide-trash-2"
          label="Delete Secret"
          tooltip="Delete Secret"
          @click="showDeleteConfirm = true"
        />
      </div>
    </div>

    <!-- Loading State using Frappe UI Spinner -->
    <div
      v-if="isLoading"
      class="flex-1 flex items-center justify-center p-6 text-ink-gray-5 text-xs"
    >
      <div class="flex flex-col items-center gap-2">
        <Spinner size="md" />
        <span>Loading secret...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex-1 p-6 text-center">
      <div
        class="p-3 rounded-4 bg-surface-base border border-outline-gray-3 text-ink-red-3 text-xs mb-3"
      >
        {{ error }}
      </div>
      <Button size="sm" variant="subtle" @click="loadSecret"> Try again </Button>
    </div>

    <!-- Secret Details Body -->
    <div v-else-if="secret" class="flex-1 p-3.5 overflow-y-auto space-y-3">
      <!-- Title & Badges Header Card -->
      <div
        class="flex items-center gap-3 bg-surface-base p-3 rounded-6 border border-outline-gray-2 shadow-elevation-1"
      >
        <SecretTypeIcon :type="secret.secret_type" size="md" />
        <div class="flex-1 min-w-0">
          <h1 class="text-sm font-bold text-ink-gray-9 truncate">{{ secret.title }}</h1>
          <div class="flex items-center gap-1.5 mt-1 flex-wrap">
            <Badge size="sm" variant="subtle" :label="secret.secret_type" />
            <Badge
              v-if="secret.folder_name"
              size="sm"
              variant="subtle"
              :label="secret.folder_name"
            />
            <span v-if="secret.shared_by" class="text-[10px] text-ink-gray-4">
              Shared by {{ secret.shared_by }}
            </span>
          </div>
        </div>
      </div>

      <!-- Contextual Quick Action Buttons Bar (Frappe UI defaults) -->
      <div class="flex gap-2">
        <!-- Password Type Quick Actions -->
        <template v-if="secret.secret_type === 'Password'">
          <Button
            size="sm"
            variant="solid"
            class="flex-1 justify-center"
            :icon-left="autofillStatus === 'success' ? 'lucide-check' : 'lucide-zap'"
            :label="
              autofillStatus === 'success'
                ? 'Filled!'
                : autofillStatus === 'failed'
                  ? 'Not found'
                  : 'Autofill'
            "
            @click="handleAutofill"
          />

          <Button
            v-if="secret.username || secret.email"
            size="sm"
            variant="subtle"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'username' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'username' ? 'Copied!' : 'Copy User'"
            @click="handleCopy('username', secret.username || secret.email)"
          />

          <Button
            v-if="secret.secret_type === 'Password' || secret.has_password"
            size="sm"
            variant="subtle"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'password' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'password' ? 'Copied!' : 'Copy Pass'"
            @click="handleCopy('password')"
          />
        </template>

        <!-- API Key Quick Actions -->
        <template v-else-if="secret.secret_type === 'API Key'">
          <Button
            v-if="secret.api_key"
            size="sm"
            variant="subtle"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'api_key' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'api_key' ? 'Copied!' : 'Copy Key'"
            @click="handleCopy('api_key', secret.api_key)"
          />

          <Button
            v-if="
              secret.secret_type === 'API Key' ||
              secret.has_api_secret ||
              secret.decrypted?.api_secret
            "
            size="sm"
            variant="solid"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'api_secret' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'api_secret' ? 'Copied!' : 'Copy Secret'"
            @click="handleCopy('api_secret')"
          />
        </template>

        <!-- Credit Card Quick Actions -->
        <template v-else-if="secret.secret_type === 'Credit Card'">
          <Button
            v-if="
              secret.secret_type === 'Credit Card' ||
              secret.has_card_number ||
              secret.decrypted?.card_number
            "
            size="sm"
            variant="solid"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'card_number' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'card_number' ? 'Copied!' : 'Copy Number'"
            @click="handleCopy('card_number')"
          />

          <Button
            v-if="
              secret.secret_type === 'Credit Card' ||
              secret.has_card_cvv ||
              secret.decrypted?.card_cvv
            "
            size="sm"
            variant="subtle"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'card_cvv' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'card_cvv' ? 'Copied!' : 'Copy CVV'"
            @click="handleCopy('card_cvv')"
          />
        </template>

        <!-- Database Quick Actions -->
        <template v-else-if="secret.secret_type === 'Database'">
          <Button
            v-if="secret.db_host"
            size="sm"
            variant="subtle"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'db_host' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'db_host' ? 'Copied!' : 'Copy Host'"
            @click="
              handleCopy(
                'db_host',
                `${secret.db_host}${secret.db_port ? ':' + secret.db_port : ''}`
              )
            "
          />

          <Button
            v-if="
              secret.secret_type === 'Database' ||
              secret.has_db_password ||
              secret.decrypted?.db_password
            "
            size="sm"
            variant="solid"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'db_password' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'db_password' ? 'Copied!' : 'Copy Pass'"
            @click="handleCopy('db_password')"
          />
        </template>

        <!-- SSH Key Quick Actions -->
        <template v-else-if="secret.secret_type === 'SSH Key'">
          <Button
            size="sm"
            variant="solid"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'ssh_private_key' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'ssh_private_key' ? 'Copied!' : 'Copy Key'"
            @click="handleCopy('ssh_private_key')"
          />
        </template>

        <!-- Note Quick Actions -->
        <template v-else-if="secret.secret_type === 'Note'">
          <Button
            v-if="secret.notes"
            size="sm"
            variant="subtle"
            class="flex-1 justify-center"
            :icon-left="copiedField === 'notes' ? 'lucide-check' : 'lucide-copy'"
            :label="copiedField === 'notes' ? 'Copied!' : 'Copy Note'"
            @click="handleCopy('notes', secret.notes)"
          />
        </template>
      </div>

      <!-- Live TOTP (2FA) Authenticator Card -->
      <div
        v-if="secret.has_totp"
        class="bg-surface-base rounded-6 border border-outline-gray-2 p-3 shadow-elevation-1 space-y-2 cursor-pointer hover:border-outline-gray-3 transition"
        title="Click to copy 2FA code"
        @click="handleCopy('totp')"
      >
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 font-semibold text-ink-gray-9">
            <Icon
              icon="lucide-clock"
              class="size-3.5"
              :class="isTotpExpiringSoon ? 'text-ink-red-3 animate-pulse' : 'text-ink-gray-7'"
            />
            <span>Two-Factor Authentication</span>
          </div>
          <Badge
            :theme="isTotpExpiringSoon ? 'red' : 'gray'"
            size="sm"
            variant="solid"
            :label="`${totpData?.remaining_seconds ?? 30}s`"
          />
        </div>

        <div class="flex items-center justify-between pt-1">
          <div class="font-mono text-xl font-bold tracking-widest text-ink-gray-9 select-all">
            {{ formattedTotpCode }}
          </div>
          <Button
            size="xs"
            :variant="copiedField === 'totp' ? 'solid' : 'ghost'"
            :theme="copiedField === 'totp' ? 'green' : 'gray'"
            :icon="copiedField === 'totp' ? 'lucide-check' : 'lucide-copy'"
            label="Copy TOTP Code"
            tooltip="Copy TOTP Code"
            @click.stop="handleCopy('totp')"
          />
        </div>

        <!-- Progress using Frappe UI Progress component -->
        <Progress :value="totpProgressPercent" size="sm" />
      </div>

      <!-- Credential Fields List (Modular SecretFieldRows) -->
      <div
        class="bg-surface-base rounded-6 border border-outline-gray-2 divide-y divide-outline-gray-1 overflow-hidden shadow-elevation-1"
      >
        <!-- URL -->
        <SecretFieldRow
          v-if="secret.url"
          label="Website URL"
          :value="secret.url"
          icon="lucide-globe"
          is-link
          :href="secret.url"
          :is-copied="copiedField === 'url'"
          @copy="handleCopy('url', secret.url)"
        />

        <!-- Username / Email -->
        <SecretFieldRow
          v-if="secret.username || secret.email"
          label="Username / Email"
          :value="secret.username || secret.email"
          icon="lucide-user"
          :is-copied="copiedField === 'username'"
          @copy="handleCopy('username', secret.username || secret.email)"
        />

        <!-- Password -->
        <SecretFieldRow
          v-if="secret.has_password || secret.secret_type === 'Password'"
          label="Password"
          :value="secret.decrypted?.password"
          icon="lucide-key-round"
          is-masked
          can-reveal
          :is-revealed="showPassword"
          :loading="isDecrypting"
          is-mono
          :badge-label="secret.password_strength || undefined"
          :badge-theme="
            secret.password_strength === 'strong' || secret.password_strength === 'excellent'
              ? 'green'
              : 'amber'
          "
          :is-copied="copiedField === 'password'"
          @toggle-reveal="toggleReveal('password')"
          @copy="handleCopy('password')"
        />

        <!-- API Key Specific -->
        <template v-if="secret.secret_type === 'API Key'">
          <SecretFieldRow
            v-if="secret.api_key"
            label="API Key"
            :value="secret.api_key"
            icon="lucide-key"
            is-mono
            :is-copied="copiedField === 'api_key'"
            @copy="handleCopy('api_key', secret.api_key)"
          />
          <SecretFieldRow
            v-if="
              secret.secret_type === 'API Key' ||
              secret.has_api_secret ||
              secret.decrypted?.api_secret
            "
            label="API Secret"
            :value="secret.decrypted?.api_secret"
            icon="lucide-key-round"
            is-masked
            can-reveal
            :is-revealed="showApiSecret"
            :loading="isDecrypting"
            is-mono
            :is-copied="copiedField === 'api_secret'"
            @toggle-reveal="toggleReveal('apiSecret')"
            @copy="handleCopy('api_secret')"
          />
        </template>

        <!-- Credit Card Specific -->
        <template v-if="secret.secret_type === 'Credit Card'">
          <SecretFieldRow
            v-if="secret.card_holder"
            label="Cardholder Name"
            :value="secret.card_holder"
            icon="lucide-user"
            :is-copied="copiedField === 'card_holder'"
            @copy="handleCopy('card_holder', secret.card_holder)"
          />
          <SecretFieldRow
            v-if="
              secret.secret_type === 'Credit Card' ||
              secret.has_card_number ||
              secret.decrypted?.card_number
            "
            label="Card Number"
            :value="secret.decrypted?.card_number"
            icon="lucide-credit-card"
            is-masked
            can-reveal
            :is-revealed="showCardNumber"
            :loading="isDecrypting"
            is-mono
            :is-copied="copiedField === 'card_number'"
            @toggle-reveal="toggleReveal('cardNumber')"
            @copy="handleCopy('card_number')"
          />
          <SecretFieldRow
            v-if="secret.card_expiry"
            label="Expires (MM/YY)"
            :value="secret.card_expiry"
            :is-copied="copiedField === 'card_expiry'"
            @copy="handleCopy('card_expiry', secret.card_expiry)"
          />
          <SecretFieldRow
            v-if="
              secret.secret_type === 'Credit Card' ||
              secret.has_card_cvv ||
              secret.decrypted?.card_cvv
            "
            label="CVV"
            :value="secret.decrypted?.card_cvv"
            icon="lucide-key-round"
            is-masked
            can-reveal
            :is-revealed="showCardCvv"
            :loading="isDecrypting"
            is-mono
            :is-copied="copiedField === 'card_cvv'"
            @toggle-reveal="toggleReveal('cardCvv')"
            @copy="handleCopy('card_cvv')"
          />
        </template>

        <!-- Database Specific -->
        <template v-if="secret.secret_type === 'Database'">
          <SecretFieldRow
            v-if="secret.db_host"
            label="Host & Port"
            :value="`${secret.db_host}${secret.db_port ? ':' + secret.db_port : ''}`"
            icon="lucide-database"
            is-mono
            :is-copied="copiedField === 'db_host'"
            @copy="
              handleCopy(
                'db_host',
                `${secret.db_host}${secret.db_port ? ':' + secret.db_port : ''}`
              )
            "
          />
          <SecretFieldRow
            v-if="secret.db_name"
            label="Database Name"
            :value="secret.db_name"
            is-mono
            :is-copied="copiedField === 'db_name'"
            @copy="handleCopy('db_name', secret.db_name)"
          />
          <SecretFieldRow
            v-if="secret.username"
            label="Database User"
            :value="secret.username"
            icon="lucide-user"
            is-mono
            :is-copied="copiedField === 'username'"
            @copy="handleCopy('username', secret.username)"
          />
          <SecretFieldRow
            v-if="
              secret.secret_type === 'Database' ||
              secret.has_db_password ||
              secret.decrypted?.db_password
            "
            label="Database Password"
            :value="secret.decrypted?.db_password"
            icon="lucide-key-round"
            is-masked
            can-reveal
            :is-revealed="showDbPassword"
            :loading="isDecrypting"
            is-mono
            :is-copied="copiedField === 'db_password'"
            @toggle-reveal="toggleReveal('dbPassword')"
            @copy="handleCopy('db_password')"
          />
        </template>

        <!-- SSH Key Specific -->
        <template v-if="secret.secret_type === 'SSH Key'">
          <div class="p-2.5 text-xs">
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-1.5">
                <Icon icon="lucide-terminal" class="size-3.5 text-ink-gray-4" />
                <span class="text-[10px] text-ink-gray-5 uppercase font-bold tracking-wider"
                  >SSH Private Key</span
                >
              </div>
              <div class="flex items-center gap-1">
                <Button
                  size="xs"
                  variant="ghost"
                  :label="showSshKey ? 'Hide' : 'Reveal'"
                  @click="toggleReveal('sshKey')"
                />
                <Button
                  size="xs"
                  :variant="copiedField === 'ssh_private_key' ? 'solid' : 'ghost'"
                  :theme="copiedField === 'ssh_private_key' ? 'green' : 'gray'"
                  :icon="copiedField === 'ssh_private_key' ? 'lucide-check' : 'lucide-copy'"
                  label="Copy SSH Key"
                  tooltip="Copy SSH Key"
                  @click="handleCopy('ssh_private_key')"
                />
              </div>
            </div>
            <div
              class="bg-surface-gray-2 p-2 rounded-3 border border-outline-gray-1 font-mono text-[11px] text-ink-gray-9 max-h-24 overflow-y-auto whitespace-pre select-all"
            >
              <span v-if="showSshKey">{{
                secret.decrypted?.ssh_private_key || secret.ssh_private_key || 'No key content'
              }}</span>
              <span v-else class="text-ink-gray-4 italic">•••••••••••• (hidden)</span>
            </div>
          </div>
        </template>

        <!-- Notes -->
        <div v-if="secret.notes" class="p-2.5 text-xs">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-1.5">
              <Icon icon="lucide-file-text" class="size-3.5 text-ink-gray-4" />
              <span class="text-[10px] text-ink-gray-5 uppercase font-bold tracking-wider"
                >Notes</span
              >
            </div>
            <Button
              size="xs"
              variant="ghost"
              :icon="copiedField === 'notes' ? 'lucide-check' : 'lucide-copy'"
              :theme="copiedField === 'notes' ? 'green' : 'gray'"
              label="Copy Notes"
              tooltip="Copy Notes"
              @click="handleCopy('notes', secret.notes)"
            />
          </div>
          <div
            class="text-ink-gray-8 whitespace-pre-wrap text-xs bg-surface-gray-2 p-2 rounded-3 border border-outline-gray-1 max-h-32 overflow-y-auto select-all"
          >
            {{ secret.notes }}
          </div>
        </div>
      </div>

      <!-- Metadata footer -->
      <div class="text-[10px] text-ink-gray-4 px-1 flex items-center justify-between">
        <span>ID: {{ secret.name }}</span>
        <span>Updated {{ formatRelativeTime(secret.modified) }}</span>
      </div>
    </div>

    <!-- Pinned Footer: Edit in Full Tab -->
    <div
      v-if="secret"
      class="px-3.5 py-2.5 bg-surface-base border-t border-outline-gray-2 flex items-center justify-between text-xs flex-shrink-0"
    >
      <div class="flex items-center gap-1.5 text-[11px] text-ink-gray-5">
        <span>Updated {{ formatRelativeTime(secret?.modified) }}</span>
      </div>
      <Button
        size="xs"
        variant="solid"
        icon-left="lucide-pencil"
        icon-right="lucide-external-link"
        label="Edit in Vault"
        tooltip="Open in Frappe Vault web app for full editing"
        @click="handleOpenVaultUrl"
      />
    </div>

    <!-- Delete Confirmation using Frappe UI Dialog component -->
    <Dialog
      v-model="showDeleteConfirm"
      title="Delete Secret"
      :message="`Are you sure you want to permanently delete '${secret?.title}'? This action cannot be undone.`"
      theme="red"
      size="xs"
      :actions="[
        {
          label: 'Delete',
          theme: 'red',
          variant: 'solid',
          loading: isDeleting,
          onClick: () => handleDelete(),
        },
      ]"
    />
  </div>
</template>
