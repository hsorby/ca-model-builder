import { defineConfig, mergeConfig } from "vite"
import baseConfig from "./vite.config.js"
import electron from "vite-plugin-electron"

// https://vite.dev/config/
export default defineConfig(
  mergeConfig(baseConfig, {
    // Add Electron-specific plugins
    plugins: [
      electron({
        entry: "src/electron/main.js",
      }),
    ],
    // Add Electron-specific build options
    build: {
      chunkSizeWarningLimit: 3000,
    },
  })
)
