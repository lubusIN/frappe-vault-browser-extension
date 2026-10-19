<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useVaultAuth } from '../../composables/useVaultAuth';
import ConnectView from '../../components/ConnectView.vue';
import SecretsListView from '../../components/SecretsListView.vue';
import SecretDetailView from '../../components/SecretDetailView.vue';
import SettingsView from '../../components/SettingsView.vue';
import NewSecretModal from '../../components/NewSecretModal.vue';
import PasswordGeneratorModal from '../../components/PasswordGeneratorModal.vue';

type Screen = 'list' | 'detail' | 'settings';

const { authState, isAuthLoading, initAuth } = useVaultAuth();

const currentScreen = ref<Screen>('list');
const selectedSecretName = ref<string>('');

// Modals
const showNewSecretModal = ref(false);
const newSecretInitialUrl = ref<string | undefined>(undefined);
const newSecretInitialTitle = ref<string | undefined>(undefined);

const showGeneratorModal = ref(false);

onMounted(async () => {
  await initAuth();
});

function handleSelectSecret(secretName: string) {
  selectedSecretName.value = secretName;
  currentScreen.value = 'detail';
}

function handleOpenNewSecret(initialUrl?: string, initialTitle?: string) {
  newSecretInitialUrl.value = initialUrl;
  newSecretInitialTitle.value = initialTitle;
  showNewSecretModal.value = true;
}

function handleSecretCreated(secretName: string) {
  selectedSecretName.value = secretName;
  currentScreen.value = 'detail';
}
</script>

<template>
  <main class="w-[380px] h-[560px] max-h-[560px] bg-slate-50 flex flex-col font-sans select-none overflow-hidden">
    <!-- Initial App Loading State -->
    <div v-if="isAuthLoading && !authState" class="flex-1 flex flex-col items-center justify-center p-6 text-slate-400 text-xs gap-3">
      <div class="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <span class="font-medium text-slate-500">Checking Frappe Vault...</span>
    </div>

    <!-- Screen 1: Connect / Login Screen -->
    <ConnectView v-else-if="!authState?.isConnected" />

    <!-- Screen 2: Authenticated Vault Screens -->
    <template v-else>
      <!-- List View -->
      <SecretsListView
        v-if="currentScreen === 'list'"
        @select="handleSelectSecret"
        @new-secret="handleOpenNewSecret"
        @open-generator="showGeneratorModal = true"
        @open-settings="currentScreen = 'settings'"
      />

      <!-- Detail View -->
      <SecretDetailView
        v-else-if="currentScreen === 'detail'"
        :secret-name="selectedSecretName"
        @back="currentScreen = 'list'"
      />

      <!-- Settings View -->
      <SettingsView
        v-else-if="currentScreen === 'settings'"
        @back="currentScreen = 'list'"
      />

      <!-- New Secret Modal -->
      <NewSecretModal
        v-if="showNewSecretModal"
        :initial-url="newSecretInitialUrl"
        :initial-title="newSecretInitialTitle"
        @close="showNewSecretModal = false"
        @created="handleSecretCreated"
      />

      <!-- Password Generator Modal -->
      <PasswordGeneratorModal
        v-if="showGeneratorModal"
        @close="showGeneratorModal = false"
      />
    </template>
  </main>
</template>
