import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const local = (name) => fileURLToPath(new URL(name, import.meta.url));
await build({
  configFile: local('vite.config.mts'),
  build: {
    outDir: '.cinematic',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      input: local('cinematic.ts'),
      preserveEntrySignatures: 'strict',
      output: { entryFileNames: 'assets/scene.js' },
    },
  },
});
await copyFile(local('cinematic.html'), local('.cinematic/index.html'));
