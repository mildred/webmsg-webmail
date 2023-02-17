import { defineConfig } from 'vite'
import { resolve } from 'path'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), basicSsl()],
  root: 'src',
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/app.js'),
      name: 'app',
      fileName: 'app',
    }
  },
  optimizeDeps: {
    exclude: ['tinro', 'svelte-timeago']
  },
})
