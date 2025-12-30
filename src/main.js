import { createApp } from 'vue'
import {
  create,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider
} from 'naive-ui'
import App from './App.vue'
import './style.css'

// Create Naive UI instance with required components
const naive = create({
  components: [
    NConfigProvider,
    NMessageProvider,
    NDialogProvider,
    NNotificationProvider
  ]
})

const app = createApp(App)
app.use(naive)
app.mount('#app')
