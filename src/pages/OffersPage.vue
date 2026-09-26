<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { listOffers } from '../api';
import { useDirectoryStore } from '../stores/directory';
import type { Offer } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import OfferCard from '../components/OfferCard.vue';
import SponsoredStrip from '../components/SponsoredStrip.vue';

useMeta({
  title: 'پیشنهادهای ویژه و جشنواره‌های بیمه | اینشورهاب',
  meta: {
    description: {
      name: 'description',
      content:
        'پیشنهادهای ویژهٔ نمایندگان و کارگزاران بر پایهٔ خدمات، و جشنواره‌های مجاز شرکت‌های بیمه؛ همه پیش از انتشار بررسی می‌شوند.',
    },
  },
});

const route = useRoute();
const router = useRouter();
const directory = useDirectoryStore();
const offers = ref<Offer[] | null>(null);
const line = ref(String(route.query.line ?? ''));
const province = ref(String(route.query.province ?? ''));
const error = ref('');

async function load(): Promise<void> {
  const params = new URLSearchParams();
  if (line.value) params.set('line', line.value);
  if (province.value) params.set('province', province.value);
  try {
    offers.value = await listOffers(params);
  } catch {
    error.value = 'دریافت پیشنهادها ممکن نشد.';
  }
}
function apply(): void {
  void router.replace({
    query: { line: line.value || undefined, province: province.value || undefined },
  });
}

watch(
  () => route.query,
  () => void load(),
);
onMounted(async () => {
  await Promise.all([load(), directory.loadTaxonomy().catch(() => undefined)]);
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">بیمه‌گذاران</div>
        <h1>پیشنهادهای ویژه و جشنواره‌ها</h1>
      </div>
    </div>
    <p class="muted-text" style="margin-top: -6px">
      رقابت در اینشورهاب بر پایهٔ خدمت است: پیشنهاد نمایندگان و کارگزاران خدمت ارزش‌افزوده دارد و
      تخفیف فقط در جشنوارهٔ مجاز شرکت بیمه و با ذکر مستند اعلام می‌شود. همهٔ پیشنهادها پیش از انتشار
      بررسی می‌شوند.
    </p>
    <form class="toolbar" @submit.prevent="apply">
      <select
        v-model="line"
        class="select"
        style="width: auto; margin: 0"
        aria-label="رشته"
        @change="apply"
      >
        <option value="">همهٔ رشته‌ها</option>
        <option v-for="item in directory.taxonomy?.insurance_lines ?? []" :key="item">
          {{ item }}
        </option>
      </select>
      <select
        v-model="province"
        class="select"
        style="width: auto; margin: 0"
        aria-label="استان"
        @change="apply"
      >
        <option value="">همهٔ استان‌ها</option>
        <option v-for="item in directory.taxonomy?.provinces ?? []" :key="item">{{ item }}</option>
      </select>
    </form>

    <SponsoredStrip
      placement="offers"
      :line="line || undefined"
      :province="province || undefined"
    />
    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!offers" class="skeleton" style="height: 240px" />
    <div v-else-if="!offers.length" class="state">
      <q-icon name="campaign" />پیشنهاد فعالی با این فیلترها نیست.
    </div>
    <div v-else class="card-grid">
      <OfferCard v-for="offer in offers" :key="offer.id" :offer="offer" />
    </div>
  </main>
  <SiteFooter />
</template>
