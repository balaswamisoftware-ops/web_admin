import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Always serve the admin portal on 5173. `strictPort` makes Vite fail loudly
  // if the port is taken instead of silently drifting to 5174/5175 — which
  // otherwise breaks the Supabase redirect URLs registered for localhost:5173.
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
  },
})
