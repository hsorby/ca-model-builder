import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Create a global constant. Strings must be JSON stringified.
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  optimizeDeps: {
    // Exclude the wasm-based library from pre-bundling
    exclude: ['vue3-libcellml.js'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
  plugins: [vue()],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      // allow: [
      // "..",
      // ],
    },
  },
})
