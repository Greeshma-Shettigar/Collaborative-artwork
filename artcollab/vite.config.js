import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  },
  build: {
    outDir: 'dist'
  },
  // 👇 This is crucial to prevent 404s when refreshing in Vercel
  resolve: {
    alias: {}
  },
  // Vercel handles rewrites with vercel.json, but this ensures local dev SPA routing works too
  preview: {
    port: 4173
  }
});
