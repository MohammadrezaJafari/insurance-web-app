import { defineRouter } from '#q-app';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';
import routes from './routes';

export default defineRouter(() =>
  createRouter({
    history: import.meta.env.QUASAR_SERVER
      ? createMemoryHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE)
      : createWebHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
    routes,
    scrollBehavior: () => ({ top: 0 }),
  }),
);
