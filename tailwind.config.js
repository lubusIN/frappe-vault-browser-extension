import frappeUIPreset from 'frappe-ui/tailwind';

export default {
  presets: [frappeUIPreset],
  content: [
    './entrypoints/**/*.{html,ts,vue}',
    './components/**/*.{html,ts,vue}',
    './node_modules/frappe-ui/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
