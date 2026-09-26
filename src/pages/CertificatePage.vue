<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import { getCertificate } from '../api';
import { faDate, faNumber } from '../format';
import type { Certificate } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

useMeta({
  title: 'استعلام گواهی | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});
const route = useRoute();
const certificate = ref<Certificate | null>(null);
const error = ref('');
onMounted(async () => {
  certificate.value = await getCertificate(String(route.params.code)).catch(() => {
    error.value = 'گواهی با این کد پیدا نشد.';
    return null;
  });
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page card-page">
    <div v-if="error" class="state state--error"><q-icon name="gpp_bad" />{{ error }}</div>
    <div v-else-if="!certificate" class="skeleton" style="height: 220px" />
    <article
      v-else
      class="business-card"
      style="aspect-ratio: auto; flex-direction: column; align-items: start"
    >
      <span class="badge badge--verified"
        ><q-icon name="verified" size="16px" />گواهی معتبر اینشورهاب</span
      >
      <h1>{{ certificate.holder }}</h1>
      <p>
        دورهٔ «{{ certificate.course }}» ({{ faNumber(certificate.duration_hours) }} ساعت) را با
        موفقیت گذرانده است.
      </p>
      <p>
        برگزارکننده:
        <router-link :to="`/profiles/${certificate.provider.slug}`" class="link">{{
          certificate.provider.name
        }}</router-link>
        · تاریخ: {{ faDate(certificate.completed_at) }}
      </p>
      <small class="muted-text" dir="ltr">{{ certificate.code }}</small>
    </article>
  </main>
  <SiteFooter />
</template>
