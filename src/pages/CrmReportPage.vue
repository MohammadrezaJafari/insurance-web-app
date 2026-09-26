<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { crmReport } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { faMoneyShort, faMonth, faNumber, faPercent, leadSources } from '../format';
import type { CrmReport } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import CrmNav from '../components/CrmNav.vue';

useMeta({
  title: 'گزارش عملکرد | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const months = ref(12);
const report = ref<CrmReport | null>(null);
const error = ref('');

const peak = computed(() =>
  Math.max(1, ...(report.value?.by_month.map((month) => month.premium) ?? [1])),
);
const linePeak = computed(() =>
  Math.max(1, ...(report.value?.by_line.map((line) => line.premium) ?? [1])),
);
const lostTotal = computed(
  () => report.value?.lost_reasons.reduce((sum, item) => sum + item.count, 0) ?? 0,
);

async function load(): Promise<void> {
  error.value = '';
  try {
    report.value = await crmReport(months.value);
  } catch {
    error.value = 'دریافت گزارش ممکن نشد.';
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
        <div class="eyebrow">مدیریت کسب‌وکار</div>
        <h1>گزارش عملکرد</h1>
      </div>
      <select
        v-model.number="months"
        class="select"
        style="width: auto; margin: 0"
        aria-label="بازه"
        @change="load"
      >
        <option :value="3">۳ ماه اخیر</option>
        <option :value="6">۶ ماه اخیر</option>
        <option :value="12">۱۲ ماه اخیر</option>
        <option :value="24">۲۴ ماه اخیر</option>
      </select>
    </div>
    <CrmNav />

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!report" class="skeleton" style="height: 320px" />
    <template v-else>
      <div class="kpi-row">
        <div class="kpi">
          <span>فروش در بازه</span><b>{{ faMoneyShort(report.totals.sold_premium) || '—' }}</b>
          <small class="muted-text">{{ faNumber(report.totals.sold_policies) }} بیمه‌نامه</small>
        </div>
        <div class="kpi">
          <span>حق بیمهٔ فعال</span><b>{{ faMoneyShort(report.totals.active_premium) || '—' }}</b>
          <small class="muted-text">{{ faNumber(report.totals.clients) }} مشتری</small>
        </div>
        <div class="kpi">
          <span>نرخ تبدیل فرصت</span><b>{{ faPercent(report.totals.conversion_rate) }}</b>
        </div>
        <div class="kpi" :class="{ 'kpi--alert': report.totals.renewals_due > 0 }">
          <span>نرخ تمدید</span><b>{{ faPercent(report.totals.renewal_rate) }}</b>
          <small class="muted-text">{{ faNumber(report.totals.renewals_due) }} سررسید نزدیک</small>
        </div>
      </div>

      <section class="card">
        <h2><q-icon name="bar_chart" />فروش ماهانه (بر اساس تاریخ شروع بیمه‌نامه)</h2>
        <div class="bars" :style="{ '--count': report.by_month.length }" role="list">
          <div
            v-for="month in report.by_month"
            :key="month.month"
            class="bars__col"
            role="listitem"
            :aria-label="`${faMonth(month.month)}: ${faMoneyShort(month.premium) || 'بدون فروش'}`"
            :title="`${faMonth(month.month)} · ${faNumber(month.policies)} بیمه‌نامه · ${faMoneyShort(month.premium) || '۰'}`"
          >
            <span class="bars__bar" :style="{ height: `${(month.premium / peak) * 100}%` }" />
            <small>{{
              faMonth(month.month, month.month.endsWith('-01') || month === report.by_month[0])
            }}</small>
          </div>
        </div>
      </section>

      <div class="profile-grid">
        <div>
          <section class="card">
            <h2><q-icon name="category" />فروش به تفکیک رشته</h2>
            <p v-if="!report.by_line.length" class="muted-text">فروشی در این بازه ثبت نشده است.</p>
            <div v-for="line in report.by_line" :key="line.line" style="margin-bottom: 10px">
              <div class="kv" style="border: 0; padding: 0">
                <b>{{ line.line }}</b>
                <span
                  >{{ faMoneyShort(line.premium) }} · {{ faNumber(line.policies) }} بیمه‌نامه</span
                >
              </div>
              <div class="meter">
                <span :style="{ width: `${(line.premium / linePeak) * 100}%` }" />
              </div>
            </div>
          </section>
          <section class="card">
            <h2><q-icon name="call_split" />فرصت‌ها به تفکیک منبع</h2>
            <p v-if="!report.by_source.length" class="muted-text">
              فرصتی در این بازه ثبت نشده است.
            </p>
            <table v-else class="line-table">
              <thead>
                <tr>
                  <th>منبع</th>
                  <th>فرصت</th>
                  <th>موفق</th>
                  <th>ناموفق</th>
                  <th>نرخ تبدیل</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in report.by_source" :key="item.source">
                  <td>{{ leadSources[item.source] }}</td>
                  <td>{{ faNumber(item.leads) }}</td>
                  <td>{{ faNumber(item.won) }}</td>
                  <td>{{ faNumber(item.lost) }}</td>
                  <td>
                    {{
                      faPercent(
                        item.won + item.lost
                          ? Math.round((item.won / (item.won + item.lost)) * 100)
                          : null,
                      )
                    }}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
        <aside>
          <section class="card">
            <h2><q-icon name="trending_down" />علت از دست رفتن فرصت</h2>
            <p v-if="!report.lost_reasons.length" class="muted-text">موردی ثبت نشده است.</p>
            <div v-for="item in report.lost_reasons" :key="item.reason" style="margin-bottom: 10px">
              <div class="kv" style="border: 0; padding: 0">
                <b>{{ item.reason }}</b
                ><span>{{ faNumber(item.count) }}</span>
              </div>
              <div class="meter">
                <span :style="{ width: `${(item.count / lostTotal) * 100}%` }" />
              </div>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
