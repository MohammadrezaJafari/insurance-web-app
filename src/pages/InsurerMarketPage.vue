<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import { ApiError, marketInsights } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { faMonth, faNumber, faPercent } from '../format';
import type { MarketInsightsReport } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import InsurerNav from '../components/InsurerNav.vue';

useMeta({
  title: 'هوش بازار | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const requireAuth = useRequireAuth();
const months = ref(12);
const data = ref<MarketInsightsReport | null>(null);
const error = ref('');
const peak = computed(() =>
  Math.max(1, ...(data.value?.by_month.map((row) => row.requests ?? 0) ?? [1])),
);

async function load(): Promise<void> {
  error.value = '';
  try {
    data.value = await marketInsights(route.query.insurer as string | undefined, months.value);
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'دریافت گزارش ممکن نشد.';
  }
}
onMounted(async () => {
  if (await requireAuth()) await load();
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">شرکت بیمه</div>
        <h1>هوش بازار</h1>
      </div>
      <select
        v-model.number="months"
        class="select"
        style="width: auto; margin: 0"
        aria-label="بازه"
        @change="load"
      >
        <option :value="6">۶ ماه</option>
        <option :value="12">۱۲ ماه</option>
        <option :value="24">۲۴ ماه</option>
      </select>
    </div>
    <InsurerNav />
    <p class="muted-text" style="margin-top: -6px">
      تقاضای ثبت‌شده در اینشورهاب به‌صورت تجمیعی و غیرشخصی. {{ data?.suppressed_note }}
    </p>

    <div v-if="error" class="state state--error">
      <q-icon name="lock" />{{ error }}
      <div style="margin-top: 12px">
        <router-link to="/account/billing" class="btn btn--amber">مشاهدهٔ پلن‌ها</router-link>
      </div>
    </div>
    <div v-else-if="!data" class="skeleton" style="height: 280px" />
    <template v-else>
      <div class="kpi-row">
        <div class="kpi">
          <span>درخواست ثبت‌شده</span><b>{{ data.total === null ? '—' : faNumber(data.total) }}</b>
        </div>
      </div>
      <section class="card">
        <h2><q-icon name="bar_chart" />روند ماهانهٔ درخواست‌ها</h2>
        <div class="bars" :style="{ '--count': data.by_month.length || 1 }">
          <div
            v-for="row in data.by_month"
            :key="row.month"
            class="bars__col"
            :title="`${faMonth(row.month)}: ${row.requests === null ? 'کمتر از حد نمایش' : faNumber(row.requests)}`"
          >
            <span class="bars__bar" :style="{ height: `${((row.requests ?? 0) / peak) * 100}%` }" />
            <small>{{ faMonth(row.month, false) }}</small>
          </div>
        </div>
      </section>
      <div class="profile-grid">
        <section class="card">
          <h2><q-icon name="category" />به تفکیک رشته</h2>
          <p v-if="!data.by_line.length" class="muted-text">هنوز گروهی به حد نمایش نرسیده است.</p>
          <table v-else class="line-table">
            <thead>
              <tr>
                <th>رشته</th>
                <th>درخواست</th>
                <th>به نتیجه رسیده</th>
                <th>میانهٔ پیشنهاد</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in data.by_line" :key="row.line">
                <td>{{ row.line }}</td>
                <td>{{ faNumber(row.requests) }}</td>
                <td>{{ faPercent(row.decided_rate) }}</td>
                <td>{{ row.median_proposals === null ? '—' : faNumber(row.median_proposals) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <aside>
          <section class="card">
            <h2><q-icon name="map" />به تفکیک استان</h2>
            <p v-if="!data.by_province.length" class="muted-text">
              هنوز گروهی به حد نمایش نرسیده است.
            </p>
            <div v-for="row in data.by_province" :key="row.province" class="kv">
              <b>{{ row.province }}</b
              ><span>{{ faNumber(row.requests) }} · {{ faPercent(row.decided_rate) }}</span>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
