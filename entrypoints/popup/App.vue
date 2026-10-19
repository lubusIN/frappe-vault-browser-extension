<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Spinner } from 'frappe-ui';
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

function handleSecretDeleted(_secretName: string) {
  selectedSecretName.value = '';
  currentScreen.value = 'list';
}
</script>

<template>
  <main class="w-[380px] h-[560px] max-h-[560px] bg-surface-gray-2 text-ink-gray-9 flex flex-col font-sans select-none overflow-hidden">
    <!-- Initial App Loading State -->
    <div v-if="isAuthLoading && !authState" class="flex-1 flex flex-col items-center justify-center p-6 text-ink-gray-5 text-xs gap-3">
      <Spinner size="lg" />
      <span class="font-medium text-ink-gray-7">Checking Frappe Vault...</span>
    </div>

    <!-- Screen 1: Connect / Login Screen -->
    <ConnectView v-else-if="!authState?.isConnected" />

    <!-- Screen 2: Authenticated Vault Screens -->
    <template v-else>
      <Transition name="fade" mode="out-in">
        <!-- List View -->
        <SecretsListView
          v-if="currentScreen === 'list'"
          key="list"
          @select="handleSelectSecret"
          @new-secret="handleOpenNewSecret"
          @open-generator="showGeneratorModal = true"
          @open-settings="currentScreen = 'settings'"
        />

        <!-- Detail View -->
        <SecretDetailView
          v-else-if="currentScreen === 'detail'"
          key="detail"
          :secret-name="selectedSecretName"
          @back="currentScreen = 'list'"
          @deleted="handleSecretDeleted"
        />

        <!-- Settings View -->
        <SettingsView
          v-else-if="currentScreen === 'settings'"
          key="settings"
          @back="currentScreen = 'list'"
        />
      </Transition>

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
