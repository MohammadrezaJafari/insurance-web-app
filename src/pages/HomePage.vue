<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRouter } from 'vue-router';
import { useDirectoryStore } from '../stores/directory';
import { actorTypes, faNumber } from '../format';
import type { ActorType } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import BrandMark from '../components/BrandMark.vue';

defineOptions({
  preFetch({ store }) {
    return useDirectoryStore(store)
      .loadStats()
      .catch(() => undefined);
  },
});
useMeta({
  title: 'اینشورهاب | مرجع شناخت بازیگران صنعت بیمه',
  meta: {
    description: {
      name: 'description',
      content:
        'شرکت‌های بیمه، کارگزاران، نمایندگان و متخصصان بیمه را با مجوز، تخصص و منبع اطلاعات بررسی‌شده پیدا کنید.',
    },
  },
});

const router = useRouter();
const directory = useDirectoryStore();
const term = ref('');
const stats = computed(() => directory.stats);
const suggestions = [
  {
    label: 'کارگزار بیمه مسئولیت در تهران',
    icon: 'gavel',
    tone: 'violet',
    query: { type: 'broker', line: 'مسئولیت', province: 'تهران' },
  },
  {
    label: 'نمایندگان بیمه در اصفهان',
    icon: 'storefront',
    tone: 'amber',
    query: { type: 'agency', province: 'اصفهان' },
  },
  {
    label: 'مشاوران ریسک پروژه‌های عمرانی',
    icon: 'engineering',
    tone: 'teal',
    query: { type: 'expert', specialty: 'پروژه‌های عمرانی' },
  },
  {
    label: 'بیمه باربری و حمل و نقل',
    icon: 'local_shipping',
    tone: 'blue',
    query: { line: 'باربری' },
  },
  { label: 'ارزیابان خسارت', icon: 'fact_check', tone: 'rose', query: { type: 'adjuster' } },
];
const types = Object.entries(actorTypes) as [ActorType, (typeof actorTypes)[ActorType]][];

function submit(): void {
  void router.push({ path: '/search', query: term.value.trim() ? { q: term.value.trim() } : {} });
}
</script>

<template>
  <SiteHeader :search="false" />
  <main>
    <section class="home-hero">
      <div class="container">
        <BrandMark class="home-hero__mark" />
        <h1>بازیگران <em>صنعت بیمه</em> را بشناسید</h1>
        <p class="home-hero__lead">
          شرکت بیمه، کارگزار، نماینده و متخصص مناسب را بر پایهٔ مجوز، تخصص، منطقه و منبعِ قابل بررسی
          پیدا کنید.
        </p>
        <form class="big-search" role="search" @submit.prevent="submit">
          <q-icon name="search" size="24px" />
          <input
            v-model="term"
            aria-label="جست‌وجو"
            placeholder="نام شرکت، کارگزار، نماینده یا حوزهٔ تخصص…"
          />
          <button class="btn btn--primary" type="submit">جست‌وجو</button>
        </form>
        <div class="suggestions">
          <router-link
            v-for="item in suggestions"
            :key="item.label"
            :to="{ path: '/search', query: item.query }"
            class="suggestion"
          >
            <span class="tile tile--sm" :class="`tone-${item.tone}`"
              ><q-icon :name="item.icon"
            /></span>
            {{ item.label }}
          </router-link>
        </div>
        <div v-if="stats" class="stat-strip">
          <div>
            <b>{{ faNumber(stats.total) }}</b
            ><span>پروفایل منتشرشده</span>
          </div>
          <div>
            <b>{{ faNumber(stats.verified) }}</b
            ><span>دارای نشان بررسی</span>
          </div>
          <div>
            <b>{{ faNumber(stats.by_type.insurer ?? 0) }}</b
            ><span>شرکت بیمه</span>
          </div>
          <div>
            <b>{{ faNumber((stats.by_type.broker ?? 0) + (stats.by_type.agency ?? 0)) }}</b>
            <span>کارگزار و نماینده</span>
          </div>
        </div>
      </div>
    </section>

    <section class="container section">
      <div class="section-head">
        <div>
          <div class="eyebrow">دسته‌بندی</div>
          <h2>از نوع بازیگر شروع کنید</h2>
        </div>
      </div>
      <div class="category-grid">
        <router-link
          v-for="[value, item] in types"
          :key="value"
          :to="{ path: '/search', query: { type: value } }"
          class="category"
        >
          <span class="tile" :class="`tone-${item.tone}`"><q-icon :name="item.icon" /></span>
          <b>{{ item.plural }}</b>
          <span>{{
            stats ? `${faNumber(stats.by_type[value] ?? 0)} پروفایل` : 'مشاهده فهرست'
          }}</span>
        </router-link>
      </div>
    </section>

    <section class="container section" style="padding-top: 0">
      <div class="request-band">
        <span class="tile tile--lg tone-blue"><q-icon name="request_quote" /></span>
        <div>
          <div class="eyebrow">استعلام بیمه</div>
          <h2>نیاز بیمه‌ای دارید؟ پیشنهاد بگیرید و مقایسه کنید</h2>
          <p>
            نیاز خود را یک بار ثبت کنید؛ پس از بررسی، حداکثر پنج کارگزار یا نمایندهٔ دارای مجوز
            بررسی‌شده پیشنهاد ساختاریافته می‌فرستند و شما پوشش، فرانشیز، استثنا و قیمت را کنار هم
            می‌بینید.
          </p>
        </div>
        <div class="stack-row">
          <router-link to="/requests/new" class="btn btn--primary">ثبت استعلام</router-link>
          <router-link to="/requests/new?type=loss_assessment" class="btn btn--outline">
            درخواست ارزیاب خسارت
          </router-link>
        </div>
      </div>
    </section>

    <section class="container section" style="padding-top: 0">
      <div class="trust-band">
        <div>
          <div class="eyebrow">اعتماد قابل بررسی</div>
          <h2>هر نشان فقط همان چیزی را می‌گوید که بررسی شده</h2>
          <p>
            وجود پروفایل، تأیید صاحب پروفایل و بررسی مجوز حرفه‌ای سه وضعیت جدا هستند و هر کدام تاریخ
            بررسی دارند.
          </p>
          <router-link to="/verification" class="btn btn--amber">معنای نشان‌ها</router-link>
        </div>
        <div class="trust-steps">
          <div>
            <q-icon name="source" size="24px" color="amber" />
            <b>منبع روشن</b>
            هر پروفایل منتشرشده دست‌کم یک منبع و تاریخ دریافت دارد.
          </div>
          <div>
            <q-icon name="verified" size="24px" color="amber" />
            <b>مجوز بررسی‌شده</b>
            شماره و مرجع مجوز با منبع رسمی مقایسه و تاریخ اعتبار آن کنترل می‌شود.
          </div>
          <div>
            <q-icon name="how_to_reg" size="24px" color="amber" />
            <b>صاحب پروفایل</b>
            مالکیت پس از بررسی مدارک واگذار و ویرایش‌ها پیش از انتشار بازبینی می‌شود.
          </div>
        </div>
      </div>
    </section>
  </main>
  <SiteFooter />
</template>
