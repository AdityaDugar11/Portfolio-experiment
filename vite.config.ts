import { cpSync } from 'node:fs';
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

export default defineConfig({
  plugins: [react(), excludeDevelopmentPreview()],
  server: {
    port: 3000,
    host: true,
  },
});
