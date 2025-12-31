import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    // Chunk size warning limit adjusted for this feature-rich SPA:
    // - The main bundle (~1.1MB raw, ~307KB gzip) contains shared app code
    // - This is acceptable for a game app with heavy animation/graphics
    // - All vendor libraries are properly code-split
    // - Individual pages are lazy-loaded
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI/Animation libraries
          'vendor-ui': ['framer-motion', 'styled-components', 'gsap'],
          // i18n
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // Pixi.js (large graphics library)
          'vendor-pixi': ['pixi.js'],
          // Drag and drop
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // Other utilities
          'vendor-misc': ['axios', 'socket.io-client', 'howler'],
          // Google OAuth
          'vendor-oauth': ['@react-oauth/google'],
          // React icons (tree-shaken, but still sizeable)
          'vendor-icons': ['react-icons'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: [],
  },
});
