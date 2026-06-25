/// <reference types="vitest/config" />
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

/**
 * Vite del frontend. Dev en :5173 (OAuth de Supabase apunta ahí); el proxy
 * `/api → :3000` evita CORS en desarrollo (el backend igual lo permite por
 * `WEB_ORIGIN`). El bloque `test` corre Vitest en jsdom para los componentes.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Code-split de las dependencias pesadas en chunks cacheables aparte del
        // código de la app, para que el bundle principal no dispare el warning de
        // 500 KB y el navegador no redescargue el vendor en cada deploy de la app.
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "data-vendor": ["@tanstack/react-query", "@supabase/supabase-js"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    css: false,
  },
})
