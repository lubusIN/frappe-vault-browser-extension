import { createApp } from 'vue';
import { FrappeUI, useColorScheme } from 'frappe-ui';
import App from './App.vue';
import './style.css';

import { getStoredSettings } from '../../utils/storage';

// Initialize Frappe UI color scheme (system/light/dark)
const { setColorScheme } = useColorScheme();
getStoredSettings().then((s) => {
  if (s.theme) {
    setColorScheme(s.theme);
  }
});

const app = createApp(App);
app.use(FrappeUI as any, { socketio: false });
app.mount('#app');
