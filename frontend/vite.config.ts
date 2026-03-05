import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3000",
      "/qr": "http://localhost:3000",
      "/webauthn": "http://localhost:3000",
      "/chat": "http://localhost:3000",
      "/users": "http://localhost:3000",
      "/user": "http://localhost:3000",
      "/profile": "http://localhost:3000",
      "/health": "http://localhost:3000",
    },
  },
});
