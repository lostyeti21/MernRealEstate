import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('🚨 proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('🔄 Proxying:', req.method, req.url, '→', proxyReq.path);
          });
        },
      },
    },
  },
  plugins: [react()],
  esbuild: {
    loader: { '.js': 'jsx' },
  },
  build: {
    // Enable minification for production builds
    minify: 'terser',
    // Configure code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code into separate chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['react-icons', 'react-hot-toast', 'framer-motion'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          'vendor-redux': ['react-redux', '@reduxjs/toolkit'],
        },
        // Limit chunk size
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Enable source maps for production (helps with debugging)
    sourcemap: true,
    // Configure chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  // Optimize dependencies that are pre-bundled
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'react-redux', '@reduxjs/toolkit'],
  },
});
