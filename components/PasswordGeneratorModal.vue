<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { generateSecurePassword, copyText } from '../utils/helpers';
import { RefreshCw, Copy, Check, X, ShieldCheck } from '@lucide/vue';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'select', password: string): void;
}>();

const props = defineProps<{
  forSelection?: boolean;
}>();

const options = reactive({
  length: 18,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
});

const generatedPassword = ref('');
const isCopied = ref(false);

function regenerate() {
  generatedPassword.value = generateSecurePassword(options);
}

async function handleCopy() {
  if (!generatedPassword.value) return;
  const ok = await copyText(generatedPassword.value);
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

// Watch length and option toggles
watch(options, () => {
  regenerate();
});

onMounted(() => {
  regenerate();
});
</script>

<template>
  <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xs overflow-hidden flex flex-col">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <ShieldCheck class="w-4 h-4 text-blue-600" />
          <h2 class="text-xs font-bold text-slate-800">Password Generator</h2>
        </div>
        <button
          type="button"
          @click="emit('close')"
          class="text-slate-400 hover:text-slate-600 p-1 rounded-md"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Generated Password Box -->
      <div class="p-4 space-y-4">
        <div class="relative bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between">
          <div class="font-mono text-xs font-semibold text-slate-900 break-all select-all pr-2">
            {{ generatedPassword }}
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              @click="regenerate"
              title="Regenerate"
              class="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition"
            >
              <RefreshCw class="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              @click="handleCopy"
              title="Copy"
              class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition"
            >
              <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-600" />
              <Copy v-else class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Length Slider -->
        <div>
          <div class="flex justify-between items-center text-xs font-medium text-slate-700 mb-1.5">
            <span>Length: {{ options.length }}</span>
            <span class="text-[11px] text-emerald-600 font-semibold">
              {{ options.length >= 16 ? 'Strong' : options.length >= 12 ? 'Good' : 'Fair' }}
            </span>
          </div>
          <input
            v-model.number="options.length"
            type="range"
            min="8"
            max="40"
            class="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        <!-- Options checkboxes -->
        <div class="space-y-2 pt-1 border-t border-slate-100 text-xs">
          <label class="flex items-center gap-2 text-slate-700 cursor-pointer">
            <input type="checkbox" v-model="options.uppercase" class="rounded text-blue-600 focus:ring-blue-500" />
            <span>Uppercase (A-Z)</span>
          </label>
          <label class="flex items-center gap-2 text-slate-700 cursor-pointer">
            <input type="checkbox" v-model="options.lowercase" class="rounded text-blue-600 focus:ring-blue-500" />
            <span>Lowercase (a-z)</span>
          </label>
          <label class="flex items-center gap-2 text-slate-700 cursor-pointer">
            <input type="checkbox" v-model="options.numbers" class="rounded text-blue-600 focus:ring-blue-500" />
            <span>Numbers (0-9)</span>
          </label>
          <label class="flex items-center gap-2 text-slate-700 cursor-pointer">
            <input type="checkbox" v-model="options.symbols" class="rounded text-blue-600 focus:ring-blue-500" />
            <span>Symbols (!@#$...)</span>
          </label>
        </div>

        <!-- Actions -->
        <div class="pt-2 flex gap-2">
          <button
            v-if="forSelection"
            type="button"
            @click="handleSelect"
            class="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            Use this password
          </button>
          <button
            type="button"
            @click="handleCopy"
            class="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
          >
            <Check v-if="isCopied" class="w-3.5 h-3.5 text-emerald-600" />
            <Copy v-else class="w-3.5 h-3.5" />
            <span>{{ isCopied ? 'Copied!' : 'Copy Password' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
