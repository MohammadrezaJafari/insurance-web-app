<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

/** Tabs of the insurer tools; the selected insurer (?insurer=slug) follows across tabs. */
const route = useRoute();
const query = computed(() => (route.query.insurer ? { insurer: route.query.insurer } : {}));
const links = [
  {
    to: '/insurer',
    label: 'شبکهٔ فروش',
    icon: 'hub',
    match: (path: string) => path === '/insurer',
  },
  {
    to: '/insurer/policies',
    label: 'تأیید بیمه‌نامه‌ها',
    icon: 'fact_check',
    match: (path: string) => path.startsWith('/insurer/policies'),
  },
  {
    to: '/insurer/commissions',
    label: 'نرخ کارمزد',
    icon: 'percent',
    match: (path: string) => path.startsWith('/insurer/commissions'),
  },
  {
    to: '/insurer/incentives',
    label: 'جشنواره‌های فروش',
    icon: 'emoji_events',
    match: (path: string) => path.startsWith('/insurer/incentives'),
  },
  {
    to: '/insurer/market',
    label: 'هوش بازار',
    icon: 'query_stats',
    match: (path: string) => path.startsWith('/insurer/market'),
  },
];
</script>

<template>
  <nav class="type-strip crm-nav" aria-label="ابزارهای شرکت بیمه">
    <router-link
      v-for="link in links"
      :key="link.to"
      :to="{ path: link.to, query }"
      :class="{ active: link.match(route.path) }"
      :aria-current="link.match(route.path) ? 'page' : undefined"
    >
      <q-icon :name="link.icon" size="18px" />{{ link.label }}
    </router-link>
  </nav>
</template>
