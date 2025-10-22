import { createApp } from "vue"
import { createPinia } from "pinia" // Import Pinia
import ElementPlus from "element-plus"
import libcellmlPlugin from "vue3-libcellml.js"
import "element-plus/dist/index.css"
import "@vue-flow/core/dist/style.css"
import '@vue-flow/minimap/dist/style.css'
import App from "./App.vue"
import "./assets/main.css"

const app = createApp(App)
const pinia = createPinia() // Create Pinia instance

app.use(pinia) // Use Pinia
app.use(ElementPlus)
app.use(libcellmlPlugin)
app.mount("#app")
