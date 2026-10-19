<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { generateSecurePassword, copyText } from '../utils/helpers';
import { Button, Badge, Checkbox, Slider, Icon } from 'frappe-ui';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', password: string): void;
}>();

defineProps<{
  forSelection?: boolean;
}>();

const options = reactive({
  length: 18,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
});

const lengthModel = computed({
  get: () => [options.length],
  set: (val: number[]) => {
    if (val && val[0] !== undefined) {
      options.length = val[0];
    }
  },
});

const generatedPassword = ref('');
const isCopied = ref(false);

function regenerate() {
  generatedPassword.value = generateSecurePassword(options);
}

async function handleCopy() {
  if (!generatedPassword.value) return;
  const ok = await copyText(generatedPassword.value, 30);
  if (ok) {
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  }
}

function handleSelect() {
  emit('select', generatedPassword.value);
  emit('close');
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close');
  }
}

// Watch length and option toggles
watch(options, () => {
  regenerate();
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  regenerate();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <div
    class="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    @click.self="emit('close')"
  >
    <div
      class="bg-surface-base rounded-6 shadow-elevation-3 border border-outline-gray-2 w-full max-w-xs overflow-hidden flex flex-col"
    >
      <!-- Header (Espresso Appbar) -->
      <div class="px-4 py-3 border-b border-outline-gray-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon icon="lucide-shield-check" class="size-4 text-ink-gray-7" />
          <h2 class="text-xs font-bold text-ink-gray-9">Password Generator</h2>
        </div>
        <Button
          icon="lucide-x"
          size="xs"
          variant="ghost"
          label="Close"
          tooltip="Close"
          @click="emit('close')"
        />
      </div>

      <!-- Generated Password Box (Espresso elevation-1) -->
      <div class="p-4 space-y-4">
        <div
          class="relative bg-surface-gray-2 border border-outline-gray-2 rounded-4 p-3 flex items-center justify-between"
        >
          <div class="font-mono text-xs font-semibold text-ink-gray-9 break-all select-all pr-2">
            {{ generatedPassword }}
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <Button
              icon="lucide-refresh-cw"
              size="xs"
              variant="ghost"
              label="Regenerate"
              tooltip="Regenerate"
              @click="regenerate"
            />
            <Button
              :icon="isCopied ? 'lucide-check' : 'lucide-copy'"
              size="xs"
              :variant="isCopied ? 'solid' : 'ghost'"
              :theme="isCopied ? 'green' : 'gray'"
              :label="isCopied ? 'Copied' : 'Copy'"
              tooltip="Copy"
              @click="handleCopy"
            />
          </div>
        </div>

        <!-- Length Slider -->
        <div>
          <div class="flex justify-between items-center text-xs font-medium text-ink-gray-7 mb-1.5">
            <span>Length: {{ options.length }}</span>
            <Badge
              :theme="options.length >= 16 ? 'green' : options.length >= 12 ? 'gray' : 'amber'"
              size="sm"
              variant="subtle"
              :label="options.length >= 16 ? 'Strong' : options.length >= 12 ? 'Good' : 'Fair'"
            />
          </div>
          <Slider v-model="lengthModel" :min="8" :max="40" :step="1" size="sm" />
        </div>

        <!-- Options checkboxes in a 2-column grid -->
        <div class="grid grid-cols-2 gap-x-3 gap-y-2.5 pt-2 border-t border-outline-gray-1 text-xs">
          <Checkbox v-model="options.uppercase" label="Uppercase (A-Z)" size="sm" />
          <Checkbox v-model="options.lowercase" label="Lowercase (a-z)" size="sm" />
          <Checkbox v-model="options.numbers" label="Numbers (0-9)" size="sm" />
          <Checkbox v-model="options.symbols" label="Symbols (!@#$...)" size="sm" />
        </div>

        <!-- Actions using Frappe UI Button defaults -->
        <div class="pt-2 flex gap-2">
          <Button
            v-if="forSelection"
            label="Use this password"
            variant="solid"
            size="sm"
            class="flex-1 justify-center"
            @click="handleSelect"
          />
          <Button
            :icon-left="isCopied ? 'lucide-check' : 'lucide-copy'"
            :label="isCopied ? 'Copied!' : 'Copy Password'"
            variant="subtle"
            size="sm"
            class="flex-1 justify-center"
            @click="handleCopy"
          />
        </div>
      </div>
    </div>
  </div>
</template>
