import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site is served from /<repo>/.
// Override with VITE_BASE when deploying elsewhere.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/archify/',
  plugins: [react()],
})
