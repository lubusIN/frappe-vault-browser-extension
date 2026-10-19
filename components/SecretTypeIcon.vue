<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from 'frappe-ui';
import type { SecretType } from '../types/vault';

const props = withDefaults(
  defineProps<{
    type?: SecretType | string;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    size: 'md',
  }
);

const iconMap: Record<string, string> = {
  Password: 'lucide-key-round',
  'API Key': 'lucide-file-code',
  Note: 'lucide-file-text',
  'SSH Key': 'lucide-terminal',
  'Credit Card': 'lucide-credit-card',
  Database: 'lucide-database',
  Media: 'lucide-paperclip',
};

const iconName = computed(() => (props.type && iconMap[props.type]) || 'lucide-shield');

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-6 rounded-3';
    case 'lg':
      return 'size-10 rounded-5';
    case 'md':
    default:
      return 'size-8 rounded-4';
  }
});

const iconSizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-3.5';
    case 'lg':
      return 'size-5';
    case 'md':
    default:
      return 'size-4';
  }
});
</script>

<template>
  <div
    class="flex items-center justify-center bg-surface-gray-2 text-ink-gray-7 border border-outline-gray-2 flex-shrink-0"
    :class="sizeClasses"
  >
    <Icon :icon="iconName" :class="iconSizeClasses" />
  </div>
</template>
