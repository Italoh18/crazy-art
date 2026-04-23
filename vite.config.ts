
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente baseadas no modo atual
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    base: '/',
    define: {
      // Outras definições se necessário
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: 'index.html',
        },
      },
    },
    server: {
      // Proxy removido para compatibilidade com Cloudflare Pages
    }
  };
});
