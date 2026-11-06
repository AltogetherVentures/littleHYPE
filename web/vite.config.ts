import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The Worker (wrangler dev) listens on 8787 and owns /api/*; the SPA is served
// by Vite in development and by the Worker's assets binding in production.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@themes": path.resolve(import.meta.dirname, "../themes"),
      "@shared": path.resolve(import.meta.dirname, "../shared"),
    },
  },
  server: {
    fs: { allow: [path.resolve(import.meta.dirname, "..")] },
    proxy: { "/api": "http://localhost:8787" },
  },
  build: { outDir: "dist" },
});
