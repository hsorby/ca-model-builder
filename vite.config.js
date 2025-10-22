import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: [
        "..",
        "/Users/hsor001/Projects/cellml/javascript/build-libcellml-release/src/bindings/javascript/",
      ],
    },
  },
})
