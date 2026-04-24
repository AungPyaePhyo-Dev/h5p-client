import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/h5p': 'http://localhost:3000',
      '/scorm': 'http://localhost:3000',
    },
  },
});
