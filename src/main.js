import { createApp } from "vue"
import { createPinia } from "pinia" // Import Pinia
import ElementPlus from "element-plus"
import libcellmlPlugin from "vue3-libcellml.js"

import "element-plus/dist/index.css"
import "@vue-flow/core/dist/style.css"
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/minimap/dist/style.css'
import '@vue-flow/node-resizer/dist/style.css'
import '@vue-flow/controls/dist/style.css'
import "./assets/main.css"

import App from "./App.vue"

const app = createApp(App)
const pinia = createPinia() // Create Pinia instance

app.use(pinia) // Use Pinia
app.use(ElementPlus)
app.use(libcellmlPlugin)
app.mount("#app")
