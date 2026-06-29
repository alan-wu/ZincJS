import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    sourcemap: true,
    outDir: 'build',
    minify: false,
    lib: {
      entry: path.resolve(__dirname, 'src/zinc.js'),
      name: 'Zinc',
      fileName: () => 'zinc.js',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id) && !id.includes('package.json'),
      output: {
        extend: true,
      }
    },
    assetsInlineLimit: 8192,
  },
});