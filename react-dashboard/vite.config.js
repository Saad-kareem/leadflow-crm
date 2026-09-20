import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Fail loudly rather than silently moving to 5174, because the API's CORS
    // allow-list names this exact origin.
    strictPort: true,
  },
});
