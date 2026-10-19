<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useVaultApi } from '../composables/useVaultApi';
import { useActiveTab } from '../composables/useActiveTab';
import type { SecretType, VaultFolder } from '../types/vault';
import PasswordGeneratorModal from './PasswordGeneratorModal.vue';
import { Button, TextInput, Textarea, Password, ErrorMessage, Select, Icon } from 'frappe-ui';

const emit = defineEmits<{
  (e: 'back'): void;
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
const showGeneratorModal = ref(false);
const folders = ref<VaultFolder[]>([]);

const secretTypeOptions = [
  { label: 'Password / Login', value: 'Password' },
  { label: 'API Key', value: 'API Key' },
  { label: 'Secure Note', value: 'Note' },
  { label: 'Credit Card', value: 'Credit Card' },
  { label: 'Database Credentials', value: 'Database' },
  { label: 'SSH Key', value: 'SSH Key' },
];

const folderOptions = computed(() => [
  { label: '(No folder)', value: '' },
  ...folders.value.map(f => ({ label: f.folder_name, value: f.name })),
]);

const form = reactive({
  title: props.initialTitle || activeTab.value?.title || activeTab.value?.domain || '',
  secret_type: 'Password' as SecretType,
  url: props.initialUrl || activeTab.value?.url || '',
  username: '',
  password: '',
  folder: '',
  notes: '',
  // API Key fields
  api_key: '',
  api_secret: '',
  // Credit Card fields
  card_holder: '',
  card_number: '',
  card_expiry: '',
  card_cvv: '',
  // Database fields
  db_host: '',
  db_port: '',
  db_name: '',
  db_password: '',
  // SSH Key
  ssh_private_key: '',
});

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showGeneratorModal.value) {
      showGeneratorModal.value = false;
    } else {
      emit('back');
    }
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);
  try {
    folders.value = await getFolders();
  } catch {}
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

function handlePasswordSelected(pwd: string) {
  if (form.secret_type === 'Database') {
    form.db_password = pwd;
  } else {
    form.password = pwd;
  }
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
    } else if (form.secret_type === 'Database') {
      payload.db_host = form.db_host;
      payload.db_port = form.db_port ? parseInt(form.db_port, 10) : undefined;
      payload.db_name = form.db_name;
      payload.username = form.username;
      payload.db_password = form.db_password;
    } else if (form.secret_type === 'SSH Key') {
      payload.ssh_private_key = form.ssh_private_key;
    }

    const res = await createSecret(payload);
    emit('created', res.name);
  } catch (err: any) {
    console.error('Failed to create secret:', err);
    errorMessage.value = err.message || 'Failed to save secret';
  } finally {
    isSubmitting.value = false;
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
      <h2 class="text-xs font-bold text-ink-gray-9">New Secret</h2>
      <div class="w-8"></div>
    </div>

    <!-- Body (Espresso cards) -->
    <div class="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
      <!-- Error Alert using Frappe UI ErrorMessage -->
      <ErrorMessage
        v-if="errorMessage"
        :message="errorMessage"
        class="p-2.5 rounded-4 bg-surface-base border border-outline-gray-3 text-xs text-ink-red-3"
      />

      <div class="bg-surface-base p-3.5 rounded-6 border border-outline-gray-2 shadow-elevation-1 space-y-3">
        <!-- Secret Type -->
        <Select
          v-model="form.secret_type"
          label="Secret Type"
          :options="secretTypeOptions"
          size="sm"
          variant="outline"
        />

        <!-- Title -->
        <TextInput
          v-model="form.title"
          label="Title"
          required
          type="text"
          placeholder="e.g. GitHub, Google Account"
          size="sm"
          variant="outline"
        />

        <!-- URL (for relevant types) -->
        <TextInput
          v-if="['Password', 'API Key'].includes(form.secret_type)"
          v-model="form.url"
          label="Website URL"
          type="text"
          placeholder="https://example.com/login"
          size="sm"
          variant="outline"
        >
          <template #prefix>
            <Icon icon="lucide-globe" class="size-3.5 text-ink-gray-4" />
          </template>
        </TextInput>

        <!-- Password Type Specific Fields -->
        <template v-if="form.secret_type === 'Password'">
          <TextInput
            v-model="form.username"
            label="Username or Email"
            type="text"
            placeholder="user@example.com"
            size="sm"
            variant="outline"
          >
            <template #prefix>
              <Icon icon="lucide-user" class="size-3.5 text-ink-gray-4" />
            </template>
          </TextInput>

          <Password
            v-model="form.password"
            placeholder="••••••••••••"
            size="sm"
            variant="outline"
            class="font-mono"
          >
            <template #label>
              <div class="flex items-center justify-between w-full">
                <span class="font-semibold text-ink-gray-7">Password</span>
                <Button
                  icon-left="lucide-wand-2"
                  label="Generate"
                  size="xs"
                  variant="ghost"
                  @click="showGeneratorModal = true"
                />
              </div>
            </template>
          </Password>
        </template>

        <!-- API Key Specific Fields -->
        <template v-else-if="form.secret_type === 'API Key'">
          <TextInput
            v-model="form.api_key"
            label="API Key"
            type="text"
            size="sm"
            variant="outline"
            class="font-mono"
          />
          <Password
            v-model="form.api_secret"
            label="API Secret"
            placeholder="••••••••••••"
            size="sm"
            variant="outline"
            class="font-mono"
          />
        </template>

        <!-- Credit Card Fields -->
        <template v-else-if="form.secret_type === 'Credit Card'">
          <TextInput
            v-model="form.card_holder"
            label="Cardholder Name"
            type="text"
            size="sm"
            variant="outline"
          />
          <TextInput
            v-model="form.card_number"
            label="Card Number"
            type="text"
            placeholder="•••• •••• •••• ••••"
            size="sm"
            variant="outline"
            class="font-mono"
          />
          <div class="grid grid-cols-2 gap-2">
            <TextInput
              v-model="form.card_expiry"
              label="Expiry (MM/YY)"
              type="text"
              placeholder="12/28"
              size="sm"
              variant="outline"
            />
            <Password
              v-model="form.card_cvv"
              label="CVV"
              placeholder="•••"
              size="sm"
              variant="outline"
              class="font-mono"
            />
          </div>
        </template>

        <!-- Database Fields -->
        <template v-else-if="form.secret_type === 'Database'">
          <div class="grid grid-cols-3 gap-2">
            <TextInput
              v-model="form.db_host"
              label="Host"
              type="text"
              placeholder="localhost"
              size="sm"
              variant="outline"
              class="col-span-2"
            />
            <TextInput
              v-model="form.db_port"
              label="Port"
              type="text"
              placeholder="5432"
              size="sm"
              variant="outline"
            />
          </div>
          <TextInput
            v-model="form.db_name"
            label="Database Name"
            type="text"
            size="sm"
            variant="outline"
          />
          <TextInput
            v-model="form.username"
            label="Username"
            type="text"
            size="sm"
            variant="outline"
          />
          <Password
            v-model="form.db_password"
            label="Password"
            placeholder="••••••••••••"
            size="sm"
            variant="outline"
            class="font-mono"
          />
        </template>

        <!-- SSH Key Fields -->
        <template v-else-if="form.secret_type === 'SSH Key'">
          <Textarea
            v-model="form.ssh_private_key"
            label="SSH Private Key"
            :rows="4"
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
            size="sm"
            variant="outline"
            class="font-mono text-[11px]"
          />
        </template>

        <!-- Folder Selection -->
        <Select
          v-if="folders.length > 0"
          v-model="form.folder"
          label="Folder"
          :options="folderOptions"
          size="sm"
          variant="outline"
        />

        <!-- Notes -->
        <Textarea
          v-model="form.notes"
          label="Notes"
          :rows="2"
          placeholder="Additional secure notes..."
          size="sm"
          variant="outline"
        />
      </div>
    </div>

    <!-- Pinned Footer: Save & Cancel -->
    <div class="px-3.5 py-2.5 bg-surface-base border-t border-outline-gray-2 flex items-center justify-between gap-2 text-xs flex-shrink-0">
      <Button
        size="sm"
        variant="subtle"
        class="flex-1 justify-center"
        label="Cancel"
        @click="emit('back')"
      />
      <Button
        size="sm"
        variant="solid"
        class="flex-1 justify-center"
        :loading="isSubmitting"
        loading-text="Saving..."
        icon-left="lucide-check"
        label="Save Secret"
        @click="handleSubmit"
      />
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
