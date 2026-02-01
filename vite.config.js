import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/P2P-Stream-Using-TURN",
  server: {
    port: 3000,
    open: true,
    https: false // Set to true for production to enable camera access
  }
});