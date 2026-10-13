import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

const corsProxyPlugin = (): Plugin => ({
  name: 'cors-proxy-middleware',
  configureServer(server) {
    server.middlewares.use('/api/proxy', async (req, res) => {
      try {
        const parsed = new URL(req.url || '', 'http://localhost:3000');
        const targetUrl = parsed.searchParams.get('url');
        if (!targetUrl) {
          res.statusCode = 400;
          return res.end('Missing url parameter');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        const resp = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timeout);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=1800');
        res.setHeader('Content-Type', resp.headers.get('content-type') || 'text/plain; charset=utf-8');
        const text = await resp.text();
        res.end(text);
      } catch (err: any) {
        res.statusCode = 502;
        res.end(err?.message || 'Proxy error');
      }
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), corsProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
