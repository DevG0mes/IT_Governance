import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // SOLUÇÃO DA TELA BRANCA: 
  // Usar './' (ponto e barra) obriga o index.html a procurar a pasta "assets" 
  // exatamente no mesmo diretório em que ele foi salvo na Hostinger.
  base: './', 
  
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5173,
    host: true
  }
})