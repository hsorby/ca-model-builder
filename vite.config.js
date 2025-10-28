import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      // When using yarn link you may need to add additional allowed paths here.
      // '..' for serving index.html from the parent folder.
      // allow: [
        // "..",
        // "/some/path/to/wasm/files",
      // ],
    },
  },
  optimizeDeps: {
    // Exclude the wasm-based library from pre-bundling
    exclude: ['vue3-libcellml.js'],
    // You may also need this target setting from your working config
    esbuildOptions: {
      target: 'es2020',
    },
  },
})
