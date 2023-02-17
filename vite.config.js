import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  root: 'public',
  publicDir: process.cwd() + '/vite-public',
  plugins: [svelte(), basicSsl()],
  optimizeDeps: {
    exclude: ['tinro', 'svelte-timeago']
  },
})
