import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { validateFrontendEnvironment } from './shared/environment';
import { writeSearchFiles } from './scripts/generate-sitemap';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const variables = loadEnv(mode, process.cwd(), 'VITE_');
  const environment = validateFrontendEnvironment(variables);
  let outputDirectory = 'dist';
  return {
  plugins: [
    react(),
    {
      name: 'environment-bound-search-files',
      configResolved: (config) => { outputDirectory = config.build.outDir; },
      transformIndexHtml: () => [
        { tag: 'meta', attrs: { name: 'app-environment', content: environment.name }, injectTo: 'head' },
        ...(environment.name === 'test' ? [
          { tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow, noarchive' }, injectTo: 'head' as const },
        ] : []),
      ],
      closeBundle: async () => { await writeSearchFiles(variables, outputDirectory); },
    },
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './assets'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@context': path.resolve(__dirname, './src/context')
    }
  }
  };
});
