import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    sourcemap: true,
    outDir: 'build',
    minify: true,
    lib: {
      entry: path.resolve(import.meta.dirname, 'src/zinc.js'),
      name: 'Zinc',
      fileName: () => 'zinc.js',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      external(id) {
        if (id.includes("nifti-reader-js")) {
          return false
        }
        return !id.startsWith('.') && !path.isAbsolute(id) && !id.includes('package.json')
      },
      output: {
        extend: true,
        globals: {
          'css-element-queries': 'cssElememtQueries',
          three: 'THREE',
          'three-spritetext': 'SpriteText',
          'three/examples/jsm/loaders/GLTFLoader': 'GLTFLoader',
          'fflate': 'fflate'
        }
      }
    },
    assetsInlineLimit: 8192,
  },
});
