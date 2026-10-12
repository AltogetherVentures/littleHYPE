import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // THE CRITICAL FIX: Explicitly set base to '/' for custom domains
  base: '/', 
  build: {
    outDir: 'dist',
  },
});