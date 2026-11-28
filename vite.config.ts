import { cpSync, readFile } from 'node:fs';
import { resolve, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function excludeDevelopmentPreview(): Plugin {
  let publicDir: string;
  let root: string;

  return {
    name: 'exclude-development-preview-assets',
    apply: 'build',
    config: () => ({ build: { copyPublicDir: false } }),
    configResolved(config) {
      publicDir = config.publicDir;
      root = config.root;
    },
    writeBundle({ dir }) {
      if (!publicDir || !dir) return;
      const preview = resolve(publicDir, 'preview', 'rajasthan-world');
      cpSync(publicDir, resolve(root, dir), {
        recursive: true,
        filter: (file) => file !== preview && !file.startsWith(preview + sep),
      });
    },
  };
}

function serveCinematicPreview(): Plugin {
  const assets = resolve('artifacts/rajasthan-world/map-phase-02-3/private/assets');
  const files = new Set(['poster.webp', 'mobile.webp', 'desktop.webp', 'depth.webp']);
  const loopback = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

  return {
    name: 'private-cinematic-preview',
    apply: 'serve',
    config: () => ({
      server: {
        fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/map-phase-02-3/private/**'] },
      },
    }),
    configureServer(server) {
      server.middlewares.use('/__rajasthan-cinematic', (req, res) => {
        const file = (req.url ?? '').slice(1);
        const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host ?? '');
        const fetchSite = req.headers['sec-fetch-site'];
        if (!localHost || !loopback.has(req.socket.remoteAddress ?? '') ||
            (fetchSite && fetchSite !== 'same-origin') || !files.has(file)) {
          res.writeHead(404).end();
          return;
        }
        readFile(resolve(assets, file), (error, bytes) => {
          if (error) {
            res.writeHead(404).end();
            return;
          }
          res.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'no-store' }).end(bytes);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), excludeDevelopmentPreview(), serveCinematicPreview()],
  server: {
    port: 3000,
    host: true,
  },
});
