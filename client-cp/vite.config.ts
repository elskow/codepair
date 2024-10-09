import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173, // Ensure this port is open and not blocked by firewall
    hmr: {
      host: "localhost",
      protocol: "ws",
    },
  }
})
