import './assets/base.css'
import './assets/output.css'

import { createApp } from 'vue'
import pinia from '@/stores/index.js'

import JsonViewer from 'vue-json-viewer'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(JsonViewer)

app.mount('#app')
