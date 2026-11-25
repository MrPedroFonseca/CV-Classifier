import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/analyze": "http://localhost:3001",
      "/models": "http://localhost:3001",
      "/resume": "http://localhost:3001"
    }
  }
});
