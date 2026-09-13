import { defineConfig } from "vite"

export default defineConfig({
  build: {
    rolldownOptions: {
      external: ["fast-uri"],
    },
    target: "es2022",
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
  },
})
