import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {},
  server: {
    allowedHosts: ["075c-117-252-109-209.ngrok-free.app"], 
    host: true, 
    port: 5173
  }
});
