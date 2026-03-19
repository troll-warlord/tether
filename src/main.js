import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './styles/main.css'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Apply stored theme before first render
import { useUiStore } from './stores/ui'
const uiStore = useUiStore()
uiStore.applyTheme()

app.mount('#app')
