<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
const links = [
  {
    to: '/crm',
    label: 'فرصت‌ها',
    icon: 'view_kanban',
    match: (path: string) => /^\/crm(\/\d+)?$/.test(path),
  },
  {
    to: '/crm/clients',
    label: 'مشتریان',
    icon: 'contacts',
    match: (path: string) => path.startsWith('/crm/clients'),
  },
  {
    to: '/crm/policies',
    label: 'بیمه‌نامه‌ها و تمدید',
    icon: 'description',
    match: (path: string) => path.startsWith('/crm/policies'),
  },
  {
    to: '/crm/assistant',
    label: 'دستیار فروش',
    icon: 'auto_awesome',
    match: (path: string) => path.startsWith('/crm/assistant'),
  },
  {
    to: '/crm/commissions',
    label: 'کارمزد و جشنواره',
    icon: 'paid',
    match: (path: string) => path.startsWith('/crm/commissions'),
  },
  {
    to: '/crm/report',
    label: 'گزارش عملکرد',
    icon: 'monitoring',
    match: (path: string) => path.startsWith('/crm/report'),
  },
];
</script>

<template>
  <nav class="type-strip crm-nav" aria-label="بخش‌های مدیریت کسب‌وکار">
    <router-link
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      :class="{ active: link.match(route.path) }"
      :aria-current="link.match(route.path) ? 'page' : undefined"
    >
      <q-icon :name="link.icon" size="18px" />{{ link.label }}
    </router-link>
  </nav>
</template>
