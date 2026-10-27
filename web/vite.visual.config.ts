import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Builds the design gallery (visual/) with Clerk stubbed out. `npm run visual`.
export default defineConfig({
  root: path.resolve(import.meta.dirname, "visual"),
  plugins: [react()],
  resolve: {
    alias: {
      "@clerk/clerk-react": path.resolve(import.meta.dirname, "visual/clerk-stub.tsx"),
      "@themes": path.resolve(import.meta.dirname, "../themes"),
      "@shared": path.resolve(import.meta.dirname, "../shared"),
    },
  },
  server: { fs: { allow: [path.resolve(import.meta.dirname, "..")] } },
  build: { outDir: path.resolve(import.meta.dirname, "../visual-dist"), emptyOutDir: true },
});
