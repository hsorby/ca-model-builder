import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      // allow: [
      // "..",
      // ],
    },
  },
  optimizeDeps: {
    // Exclude the wasm-based library from pre-bundling
    exclude: ["vue3-libcellml.js"],
    esbuildOptions: {
      target: "es2020",
    },
  },
})
