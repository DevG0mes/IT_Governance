import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // O "base" garante que os caminhos dos arquivos gerados fiquem relativos ou apontem para a raiz correta
  base: '/', 
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Limpa a pasta dist velha antes de gerar uma nova
    chunkSizeWarningLimit: 1000, // Evita avisos chatos no terminal se o sistema ficar grande
  },
  server: {
    port: 5173,
    host: true
  }
})