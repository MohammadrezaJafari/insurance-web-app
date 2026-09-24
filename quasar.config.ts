import { defineConfig } from '#q-app';

export default defineConfig(() => ({
  preFetch: true,
  boot: [],
  css: ['app.scss'],
  extras: ['material-icons'],
  build: {
    vueRouterMode: 'history',
    typescript: { strict: true, vueShim: true },
    env: { clientPrefix: 'VITE_' },
  },
  devServer: {
    port: 9000,
    open: false,
    proxy: {
      '/api': {
        target: process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  framework: {
    lang: 'fa-IR',
    plugins: ['Notify', 'Meta'],
  },
  animations: [],
  ssr: {
    middlewares: ['seo', 'render'],
  },
}));
