import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        // MODO ARQUITETO:
        // Removi "host: '0.0.0.0'" que causa instabilidade no WebSocket no Windows.
        // Adicionei configuração explícita de HMR para garantir o Hot Reload.
        hmr: {
            host: 'localhost',
            port: 3000,
        },
        watch: {
          // Garante que o Windows detecte alterações nos arquivos
          usePolling: true,
        }
      },
      plugins: [react()],
      define: {
        // Mantém suas variáveis de ambiente funcionais
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});