import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Builds the design gallery (visual/) with sign-in stubbed out. `npm run visual`.
export default defineConfig({
  root: path.resolve(import.meta.dirname, "visual"),
  // The app's static files (the marketing pages' screenshots live there).
  publicDir: path.resolve(import.meta.dirname, "public"),
  plugins: [react()],
  resolve: {
    alias: [
      // The app's sign-in module (imported as "./auth" or "../lib/auth") is replaced by the stub.
      { find: /^(\.\.\/lib\/auth|\.\/auth)$/, replacement: path.resolve(import.meta.dirname, "visual/auth-stub.tsx") },
      { find: "@themes", replacement: path.resolve(import.meta.dirname, "../themes") },
      { find: "@shared", replacement: path.resolve(import.meta.dirname, "../shared") },
    ],
  },
  server: { fs: { allow: [path.resolve(import.meta.dirname, "..")] } },
  build: { outDir: path.resolve(import.meta.dirname, "../visual-dist"), emptyOutDir: true },
});
