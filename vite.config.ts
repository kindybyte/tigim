import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // Каждая страница уезжает в свой чанк (см. App.tsx + React.lazy),
    // плюс вендоры разнесены вручную — они меняются редко, поэтому
    // браузерный кэш переживает наши деплои.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-icons": ["lucide-react"],
          "vendor-dnd": ["@dnd-kit/core"],
        },
      },
    },
    // Vite-предупреждение про крупные чанки — глушим, у нас уже есть splitting.
    chunkSizeWarningLimit: 600,
  },
});
