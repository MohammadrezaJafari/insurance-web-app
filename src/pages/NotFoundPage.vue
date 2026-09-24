<script setup lang="ts">
import { useMeta } from 'quasar';

defineOptions({
  preFetch({ ssrContext }) {
    if (ssrContext) (ssrContext as { statusCode?: number }).statusCode = 404;
  },
});
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

useMeta({
  title: 'صفحه پیدا نشد | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});
</script>

<template>
  <SiteHeader />
  <main class="container account-page">
    <div class="state">
      <q-icon name="explore_off" />
      <h1 style="font-size: 22px; margin: 0 0 8px">صفحه مورد نظر پیدا نشد</h1>
      <p style="margin: 0 0 16px">صفحه‌ای که به دنبال آن هستید وجود ندارد یا جابه‌جا شده است.</p>
      <router-link to="/" class="btn btn--outline">بازگشت به صفحه اصلی</router-link>
    </div>
  </main>
  <SiteFooter />
</template>
