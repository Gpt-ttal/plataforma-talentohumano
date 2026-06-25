import { defineConfig } from "vitest/config"
export default defineConfig({
  root: ".",
  css: { postcss: {} },
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    environment: "node",
  },
})
