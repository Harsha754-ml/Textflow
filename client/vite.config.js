import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'SMS Dashboard',
        short_name: 'SMS',
        description: 'Advanced SMS Messaging Platform',
        theme_color: '#000000',
        icons: []
      }
    })
  ],
  server: {
    port: 5173,
  },
});
