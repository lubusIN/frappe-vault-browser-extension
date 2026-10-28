import { vi } from 'vitest';

// In-memory mock storage for browser.storage.local
const storageData: Record<string, any> = {};

export const mockStorageLocal = {
  get: vi.fn(async (keys?: string | string[] | Record<string, any> | null) => {
    if (!keys) return { ...storageData };
    if (typeof keys === 'string') {
      return { [keys]: storageData[keys] };
    }
    if (Array.isArray(keys)) {
      const res: Record<string, any> = {};
      keys.forEach((k) => {
        if (storageData[k] !== undefined) res[k] = storageData[k];
      });
      return res;
    }
    const res: Record<string, any> = {};
    Object.keys(keys).forEach((k) => {
      res[k] = storageData[k] !== undefined ? storageData[k] : keys[k];
    });
    return res;
  }),
  set: vi.fn(async (items: Record<string, any>) => {
    Object.assign(storageData, items);
  }),
  remove: vi.fn(async (keys: string | string[]) => {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((k) => delete storageData[k]);
  }),
  clear: vi.fn(async () => {
    Object.keys(storageData).forEach((k) => delete storageData[k]);
  }),
};

export const mockRuntime = {
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

export const mockTabs = {
  query: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn(),
  create: vi.fn(),
  onRemoved: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

export const mockCommands = {
  onCommand: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

export const mockAction = {
  setBadgeText: vi.fn(),
  setBadgeBackgroundColor: vi.fn(),
};

// Polyfill browser & chrome globally in test environment
// @ts-expect-error Mocking global WebExtension API
globalThis.browser = {
  storage: {
    local: mockStorageLocal,
  },
  runtime: mockRuntime,
  tabs: mockTabs,
  commands: mockCommands,
  action: mockAction,
  browserAction: mockAction,
};

// @ts-expect-error Mocking global WebExtension API
globalThis.chrome = globalThis.browser;

// @ts-expect-error Mocking WXT globals for testing
globalThis.defineBackground = (fn: any) => fn;
// @ts-expect-error Mocking WXT globals for testing
globalThis.defineContentScript = (obj: any) => obj;

// Mock frappe-ui components and composables for Vitest Node / happy-dom environment
vi.mock('frappe-ui', () => ({
  Button: {
    name: 'Button',
    props: ['label', 'icon', 'variant', 'size', 'theme', 'loading', 'tooltip', 'type'],
    template:
      '<button :type="type || \'button\'" :disabled="loading" :data-icon="icon" :tooltip="tooltip"><slot />{{ label }}</button>',
  },
  Badge: {
    name: 'Badge',
    props: ['label', 'theme', 'size', 'variant'],
    template: '<span><slot />{{ label }}</span>',
  },
  Avatar: {
    name: 'Avatar',
    props: ['label', 'image', 'size', 'shape', 'theme'],
    template: '<div class="avatar">{{ label }}</div>',
  },
  Icon: {
    name: 'Icon',
    props: ['icon'],
    template: '<i :data-icon="icon"></i>',
  },
  Switch: {
    name: 'Switch',
    props: ['modelValue', 'disabled'],
    template: '<input type="checkbox" :checked="modelValue" />',
  },
  Dialog: {
    name: 'Dialog',
    props: ['modelValue', 'options'],
    template: '<div v-if="modelValue"><slot /></div>',
  },
  Checkbox: {
    name: 'Checkbox',
    props: ['modelValue', 'label'],
    template: '<label><input type="checkbox" :checked="modelValue" />{{ label }}</label>',
  },
  Slider: {
    name: 'Slider',
    props: ['modelValue'],
    template: '<input type="range" :value="modelValue" />',
  },
  TextInput: {
    name: 'TextInput',
    props: ['modelValue', 'type', 'placeholder', 'disabled', 'label'],
    template:
      '<input :type="type || \'text\'" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  Password: {
    name: 'Password',
    props: ['modelValue', 'placeholder', 'disabled'],
    template:
      '<input type="password" :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  ErrorMessage: {
    name: 'ErrorMessage',
    props: ['message'],
    template: '<div v-if="message" class="error-msg">{{ message }}</div>',
  },
  TabButtons: {
    name: 'TabButtons',
    props: ['buttons', 'options', 'modelValue'],
    template:
      '<div><button v-for="b in (options || buttons || [])" :key="b.value" @click="$emit(\'update:modelValue\', b.value)">{{ b.label }}</button></div>',
  },
  KeyboardShortcut: {
    name: 'KeyboardShortcut',
    props: ['combo', 'bg', 'showPlus', 'altCombos', 'useIcons'],
    template: '<kbd :data-combo="combo" class="keyboard-shortcut"><slot>{{ combo }}</slot></kbd>',
  },
  Spinner: {
    name: 'Spinner',
    template: '<div class="spinner"></div>',
  },
  Dropdown: {
    name: 'Dropdown',
    props: ['options'],
    template: '<div><slot /><slot name="button" /></div>',
  },
  Textarea: {
    name: 'Textarea',
    props: ['modelValue', 'placeholder'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea>',
  },
  Select: {
    name: 'Select',
    props: ['modelValue', 'options'],
    template:
      '<select :value="modelValue"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
  },
  useColorScheme: () => ({
    colorScheme: { value: 'system' },
    resolvedColorScheme: { value: 'dark' },
    setColorScheme: vi.fn(),
  }),
}));
