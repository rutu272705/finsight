import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api to Flask so the browser never needs the backend's address or any API key.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": { target: process.env.VITE_API_TARGET || "http://localhost:5000", changeOrigin: true } } },
  test: { environment: "jsdom", globals: true, setupFiles: "./src/test/setup.js", css: false },
});
