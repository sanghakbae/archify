import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at the root of the custom domain (diagram.sanghak.kr), so base is '/'.
// Override with VITE_BASE (e.g. '/archify/') when serving from a subpath such
// as the sanghakbae.github.io/archify/ project URL.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
