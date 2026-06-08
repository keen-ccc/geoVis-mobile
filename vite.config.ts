import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'

export default defineConfig({
  plugins: [vue(), svgLoader()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/offline-tiles': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/allBank.csv': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
})
