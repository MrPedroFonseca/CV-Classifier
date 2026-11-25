import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/analyze": "http://127.0.0.1:3001",
      "/models": "http://127.0.0.1:3001",
      "/resume": "http://127.0.0.1:3001"
    }
  }
});
