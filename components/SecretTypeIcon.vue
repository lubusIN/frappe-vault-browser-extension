<script setup lang="ts">
import { computed } from 'vue';
import type { SecretType } from '../types/vault';
import {
  KeyRound,
  FileCode,
  FileText,
  Terminal,
  CreditCard,
  Database,
  Paperclip,
  Shield,
} from '@lucide/vue';

const props = defineProps<{
  type?: SecretType | string;
  size?: number | string;
}>();

const iconComponent = computed(() => {
  switch (props.type) {
    case 'Password':
      return KeyRound;
    case 'API Key':
      return FileCode;
    case 'Note':
      return FileText;
    case 'SSH Key':
      return Terminal;
    case 'Credit Card':
      return CreditCard;
    case 'Database':
      return Database;
    case 'Media':
      return Paperclip;
    default:
      return Shield;
  }
});

const colorClasses = computed(() => {
  switch (props.type) {
    case 'Password':
      return 'bg-blue-50 text-blue-600 border-blue-100';
    case 'API Key':
      return 'bg-purple-50 text-purple-600 border-purple-100';
    case 'Note':
      return 'bg-amber-50 text-amber-600 border-amber-100';
    case 'SSH Key':
      return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'Credit Card':
      return 'bg-rose-50 text-rose-600 border-rose-100';
    case 'Database':
      return 'bg-cyan-50 text-cyan-600 border-cyan-100';
    case 'Media':
      return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    default:
      return 'bg-gray-50 text-gray-600 border-gray-100';
  }
});
</script>

<template>
  <div
    class="flex items-center justify-center rounded-lg border flex-shrink-0"
    :class="[colorClasses, size === 'sm' ? 'w-7 h-7' : 'w-8 h-8']"
  >
    <component :is="iconComponent" :class="size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'" />
  </div>
</template>
