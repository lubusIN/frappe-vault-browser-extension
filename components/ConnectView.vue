<script setup lang="ts">
import { ref } from 'vue';
import { useVaultAuth } from '../composables/useVaultAuth';
import VaultIcon from './VaultIcon.vue';
import { Button, TextInput, Password, ErrorMessage, TabButtons, Icon } from 'frappe-ui';

const { loginWithPassword, loginWithToken, authError, isAuthLoading } = useVaultAuth();

const instanceUrl = ref('');
const authMode = ref<'password' | 'token'>('password');

// Password fields
const username = ref('');
const password = ref('');

// Token fields
const apiKey = ref('');
const apiSecret = ref('');

const authModeOptions = [
  { label: 'User Login', value: 'password', iconLeft: 'lucide-lock' },
  { label: 'API Token', value: 'token', iconLeft: 'lucide-key' },
];

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
  <div class="flex flex-col h-full bg-surface-gray-2 text-ink-gray-9">
    <!-- Header / Brand (Espresso elevation) -->
    <div class="pt-8 pb-3 px-6 text-center flex flex-col items-center">
      <VaultIcon size="size-12" class="rounded-5 shadow-elevation-1 mb-3" />
      <h1 class="text-base font-bold tracking-tight text-ink-gray-9">Frappe Vault</h1>
      <p class="text-xs text-ink-gray-5 mt-0.5">Connect to your hosted vault instance</p>
    </div>

    <!-- Mode Selector Tabs using Frappe UI TabButtons -->
    <div class="px-6 mb-3">
      <TabButtons
        v-model="authMode"
        :options="authModeOptions"
        variant="subtle"
        size="sm"
        fluid
      />
    </div>

    <!-- Main Form in Espresso card -->
    <div class="flex-1 px-6 pb-6 overflow-y-auto">
      <form @submit.prevent="handleConnect" class="space-y-3 bg-surface-base p-4 rounded-6 border border-outline-gray-2 shadow-elevation-1">
        <!-- Instance URL -->
        <TextInput
          v-model="instanceUrl"
          label="Instance URL"
          type="text"
          placeholder="https://vault.example.com"
          size="sm"
          variant="outline"
          required
        >
          <template #prefix>
            <Icon icon="lucide-server" class="size-3.5 text-ink-gray-4" />
          </template>
        </TextInput>

        <!-- Mode: Password -->
        <template v-if="authMode === 'password'">
          <TextInput
            v-model="username"
            label="Email or Username"
            type="text"
            placeholder="user@example.com"
            size="sm"
            variant="outline"
            required
          />

          <Password
            v-model="password"
            label="Password"
            placeholder="••••••••••••"
            size="sm"
            variant="outline"
            required
          />
        </template>

        <!-- Mode: Token -->
        <template v-else>
          <TextInput
            v-model="apiKey"
            label="API Key"
            type="text"
            placeholder="e.g. 5e91bc..."
            size="sm"
            variant="outline"
            required
          />

          <Password
            v-model="apiSecret"
            label="API Secret"
            description="Find in Frappe under User Profile > API Access."
            placeholder="••••••••••••"
            size="sm"
            variant="outline"
            required
          />
        </template>

        <!-- Error Alert -->
        <ErrorMessage
          v-if="authError"
          :message="authError"
          class="p-2.5 rounded-4 bg-surface-gray-2 border border-outline-gray-3 text-xs"
        />

        <!-- Submit Button using Frappe UI Button -->
        <div class="pt-2">
          <Button
            type="submit"
            variant="solid"
            size="md"
            :loading="isAuthLoading"
            loading-text="Connecting..."
            class="w-full justify-center"
          >
            Connect to Vault
          </Button>
        </div>
      </form>

      <!-- Local dev helper -->
      <div class="mt-3 text-center">
        <Button
          variant="ghost"
          size="xs"
          theme="gray"
          class="text-ink-gray-5 hover:text-ink-gray-7 underline"
          @click="setLocalDev"
        >
          Use local development site (localhost:8000)
        </Button>
      </div>
    </div>
  </div>
</template>
