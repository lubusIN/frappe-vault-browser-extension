import { createApp } from 'vue';
import { FrappeUI } from 'frappe-ui';
import App from './App.vue';
import './style.css';

const app = createApp(App);
app.use(FrappeUI as any, { socketio: false });
app.mount('#app');
