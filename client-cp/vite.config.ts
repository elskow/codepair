import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173, // Ensure this port is open and not blocked by firewall
    hmr: {
      host: "localhost",
      protocol: "ws",
    },
  }
})
