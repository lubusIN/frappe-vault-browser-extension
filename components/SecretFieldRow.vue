<script setup lang="ts">
import { Button, Badge, Icon } from 'frappe-ui';
import { openExternalUrl } from '../utils/helpers';

const emit = defineEmits<{
  (e: 'copy'): void;
  (e: 'toggle-reveal'): void;
}>();

const props = withDefaults(
  defineProps<{
    label: string;
    value?: string | number | null;
    icon?: string;
    isMasked?: boolean;
    isRevealed?: boolean;
    canReveal?: boolean;
    canCopy?: boolean;
    isCopied?: boolean;
    isMono?: boolean;
    isLink?: boolean;
    href?: string;
    badgeLabel?: string;
    badgeTheme?: 'gray' | 'blue' | 'green' | 'amber' | 'red';
    loading?: boolean;
  }>(),
  {
    isMasked: false,
    isRevealed: false,
    canReveal: false,
    canCopy: true,
    isCopied: false,
    isMono: false,
    isLink: false,
    badgeTheme: 'gray',
    loading: false,
  }
);
</script>

<template>
  <div class="p-2.5 flex items-center justify-between text-xs hover:bg-surface-gray-1 transition group">
    <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
      <Icon
        v-if="icon"
        :icon="icon"
        class="size-3.5 text-ink-gray-4 flex-shrink-0"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] text-ink-gray-5 uppercase font-bold tracking-wider">
            {{ label }}
          </span>
        </div>

        <!-- Custom slot or standard text -->
        <div class="mt-0.5 min-w-0">
          <slot>
            <!-- Link with Frappe UI styling -->
            <div v-if="isLink && (href || value)" class="flex items-center gap-1 min-w-0">
              <button
                type="button"
                class="text-ink-gray-9 hover:underline truncate text-left text-xs cursor-pointer flex items-center gap-1.5 max-w-full font-medium"
                :title="href || String(value)"
                @click="openExternalUrl(href || String(value))"
              >
                <span class="truncate">{{ value }}</span>
                <Icon icon="lucide-external-link" class="size-3 flex-shrink-0 text-ink-gray-4" />
              </button>
            </div>

            <!-- Masked field (password, secret, card) -->
            <div
              v-else-if="isMasked"
              class="truncate select-all"
              :class="isMono ? 'font-mono text-xs' : 'text-xs'"
            >
              <span v-if="isRevealed" class="text-ink-gray-9 font-medium">
                {{ value || '(empty)' }}
              </span>
              <span v-else-if="loading" class="text-ink-gray-4 italic text-[11px]">
                Decrypting...
              </span>
              <span v-else class="tracking-widest text-ink-gray-7">
                ••••••••••••
              </span>
            </div>

            <!-- Standard text -->
            <div
              v-else
              class="truncate select-all font-medium text-ink-gray-9 text-xs"
              :class="{ 'font-mono': isMono }"
            >
              {{ value || '—' }}
            </div>
          </slot>
        </div>
      </div>
    </div>

    <!-- Actions using Frappe UI Button defaults (Vertically centered) -->
    <div class="flex items-center gap-1.5 flex-shrink-0">
      <Badge
        v-if="badgeLabel"
        size="sm"
        :theme="badgeTheme"
        variant="subtle"
        :label="badgeLabel"
        class="capitalize"
      />

      <Button
        v-if="canReveal"
        :icon="isRevealed ? 'lucide-eye-off' : 'lucide-eye'"
        size="xs"
        variant="ghost"
        :label="isRevealed ? 'Hide' : 'Reveal'"
        :tooltip="isRevealed ? 'Hide' : 'Reveal'"
        @click="emit('toggle-reveal')"
      />

      <Button
        v-if="canCopy && (isMasked || (value !== undefined && value !== null && value !== ''))"
        :icon="isCopied ? 'lucide-check' : 'lucide-copy'"
        size="xs"
        :variant="isCopied ? 'solid' : 'ghost'"
        :theme="isCopied ? 'green' : 'gray'"
        :loading="loading && !value"
        :label="isCopied ? 'Copied' : `Copy ${label}`"
        :tooltip="isCopied ? 'Copied!' : `Copy ${label}`"
        @click="emit('copy')"
      />
    </div>
  </div>
</template>
