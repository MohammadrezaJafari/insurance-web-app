<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import { getOffer } from '../api';
import { actorTypes, faDate } from '../format';
import type { Offer } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

const route = useRoute();
const offer = ref<Offer | null>(null);
const error = ref('');
const inquiryLink = computed(() =>
  offer.value?.provider
    ? {
        path: '/requests/new',
        query: {
          provider: offer.value.provider.slug,
          offer: String(offer.value.id),
          line: offer.value.insurance_lines[0],
        },
      }
    : '/requests/new',
);

useMeta(() => ({
  title: offer.value ? `${offer.value.title} | اینشورهاب` : 'پیشنهاد ویژه | اینشورهاب',
  meta: offer.value
    ? { description: { name: 'description', content: offer.value.body.slice(0, 160) } }
    : {},
}));

onMounted(async () => {
  try {
    offer.value = await getOffer(Number(route.params.id));
  } catch {
    error.value = 'این پیشنهاد پیدا نشد یا به پایان رسیده است.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/offers">پیشنهادهای ویژه</router-link>
      <q-icon name="chevron_left" />
      <span>{{ offer?.title ?? 'پیشنهاد' }}</span>
    </nav>
    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!offer" class="skeleton" style="height: 240px" />
    <div v-else class="profile-grid">
      <article class="card">
        <span class="badge" :class="offer.kind === 'festival' ? 'badge--amber' : 'badge--brand'">
          {{ offer.kind === 'festival' ? 'جشنوارهٔ شرکت بیمه' : 'پیشنهاد خدمت' }}
        </span>
        <h1 style="margin: 10px 0 4px; font-size: 24px">{{ offer.title }}</h1>
        <p class="muted-text" style="margin: 0 0 12px">
          {{ faDate(offer.starts_on) }} تا {{ faDate(offer.ends_on) }} ·
          {{ offer.insurance_lines.join('، ') }}
          <template v-if="offer.provinces.length"> · {{ offer.provinces.join('، ') }}</template>
        </p>
        <p v-if="offer.discount_text" class="offer-card__discount" style="font-size: 18px">
          {{ offer.discount_text }}
        </p>
        <p class="pre">{{ offer.body }}</p>
        <template v-if="offer.services.length">
          <h2><q-icon name="volunteer_activism" />خدمات همراه</h2>
          <ul class="tiers">
            <li v-for="service in offer.services" :key="service" class="reached">
              <q-icon name="check_circle" />{{ service }}
            </li>
          </ul>
        </template>
        <p v-if="offer.regulatory_reference" class="card__note">
          مستند مجوز تخفیف: {{ offer.regulatory_reference }}
        </p>
      </article>
      <aside>
        <section v-if="offer.provider" class="card">
          <h2><q-icon :name="actorTypes[offer.provider.type].icon" />ارائه‌دهنده</h2>
          <router-link
            :to="`/profiles/${offer.provider.slug}`"
            class="link"
            style="font-weight: 700"
          >
            {{ offer.provider.name }}
          </router-link>
          <p class="muted-text" style="margin: 4px 0 12px">
            {{ actorTypes[offer.provider.type].label }}
            <template v-if="offer.provider.province"> · {{ offer.provider.province }}</template>
          </p>
          <router-link :to="inquiryLink" class="btn btn--primary btn--block">
            <q-icon name="request_quote" size="18px" />درخواست استعلام از این ارائه‌دهنده
          </router-link>
          <p class="card__note">
            پیشنهاد ویژه به معنای تأیید قیمت یا کیفیت از سوی اینشورهاب نیست؛ شرایط نهایی را در
            پیشنهاد رسمی ارائه‌دهنده بررسی کنید.
          </p>
        </section>
      </aside>
    </div>
  </main>
  <SiteFooter />
</template>
