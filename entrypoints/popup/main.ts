import { createApp } from 'vue';
import { FrappeUI, useColorScheme } from 'frappe-ui';
import App from './App.vue';
import './style.css';

// Initialize Frappe UI color scheme (system/light/dark)
useColorScheme();

const app = createApp(App);
app.use(FrappeUI as any, { socketio: false });
app.mount('#app');
