<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { billingPlans, myBilling, subscribe } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { errorMessage, faDate, faMoney, faMoneyShort, faNumber } from '../format';
import type { BillingOverview, BillingPlan } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'اشتراک و صورت‌حساب | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const plans = ref<BillingPlan[]>([]);
const enforced = ref(false);
const overview = ref<BillingOverview | null>(null);
const period = ref<'monthly' | 'yearly'>('yearly');
const busy = ref('');
const error = ref('');
const message = ref('');

const audienceOf: Record<string, BillingPlan['audience']> = {
  broker: 'provider',
  agency: 'provider',
  expert: 'specialist',
  adjuster: 'specialist',
  insurer: 'insurer',
  organization: 'organization',
};
const subscriptionStatuses: Record<string, { label: string; tone: string }> = {
  pending_payment: { label: 'در انتظار پرداخت', tone: 'amber' },
  active: { label: 'فعال', tone: 'verified' },
  expired: { label: 'منقضی', tone: 'neutral' },
  cancelled: { label: 'لغوشده', tone: 'neutral' },
};
const invoiceStatuses: Record<string, { label: string; tone: string }> = {
  issued: { label: 'پرداخت‌نشده', tone: 'amber' },
  paid: { label: 'پرداخت‌شده', tone: 'verified' },
  void: { label: 'باطل', tone: 'neutral' },
};
const offers = computed(() =>
  (overview.value?.subjects ?? [])
    .map((subject) => ({
      subject,
      plans: plans.value.filter((plan) => plan.audience === audienceOf[subject.kind]),
    }))
    .filter((row) => row.plans.length),
);

async function load(): Promise<void> {
  const [catalog, mine] = await Promise.all([billingPlans(), myBilling()]);
  plans.value = catalog.plans;
  enforced.value = catalog.enforced;
  overview.value = mine;
}
async function buy(plan: BillingPlan, subject: string): Promise<void> {
  busy.value = `${plan.key}:${subject}`;
  error.value = '';
  message.value = '';
  try {
    await subscribe(plan.key, period.value, subject);
    message.value = 'صورت‌حساب صادر شد. پس از واریز و ثبت پرداخت، اشتراک فعال می‌شود.';
    await load();
  } catch (exception) {
    error.value = errorMessage(exception, 'ثبت ممکن نشد.');
  } finally {
    busy.value = '';
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
        <div class="eyebrow">حساب کاربری</div>
        <h1>اشتراک و صورت‌حساب</h1>
      </div>
      <div class="segmented" role="tablist" style="margin: 0; min-width: 220px">
        <button role="tab" :class="{ active: period === 'monthly' }" @click="period = 'monthly'">
          ماهانه
        </button>
        <button role="tab" :class="{ active: period === 'yearly' }" @click="period = 'yearly'">
          سالانه
        </button>
      </div>
    </div>
    <p v-if="!enforced" class="notice notice--info">
      در دورهٔ آزمایشی همهٔ قابلیت‌ها بدون اشتراک در دسترس است. خرید اشتراک اختیاری است.
    </p>
    <div v-if="message" class="notice">{{ message }}</div>
    <div v-if="error" class="notice notice--error">{{ error }}</div>

    <div v-if="!overview" class="skeleton" style="height: 280px" />
    <template v-else>
      <p v-if="!offers.length" class="state">
        <q-icon name="badge" />پلن‌ها برای صاحبان پروفایل حرفه‌ای و سازمان‌های خریدار است.
      </p>
      <section v-for="row in offers" :key="row.subject.key">
        <h2 class="section-title">{{ row.subject.name }}</h2>
        <div class="card-grid">
          <article v-for="plan in row.plans" :key="plan.key" class="card plan-card">
            <b>{{ plan.label }}</b>
            <p class="muted-text">{{ plan.summary }}</p>
            <div class="plan-card__price">
              {{ faMoneyShort(period === 'yearly' ? plan.price_yearly : plan.price_monthly) }}
              <small>/ {{ period === 'yearly' ? 'سال' : 'ماه' }} + مالیات</small>
            </div>
            <button
              class="btn btn--primary btn--block"
              :disabled="busy !== ''"
              @click="buy(plan, row.subject.key)"
            >
              صدور صورت‌حساب
            </button>
          </article>
        </div>
      </section>

      <div class="profile-grid">
        <section class="card">
          <h2><q-icon name="receipt_long" />صورت‌حساب‌ها</h2>
          <p v-if="!overview.invoices.length" class="muted-text">صورت‌حسابی ندارید.</p>
          <table v-else class="line-table">
            <thead>
              <tr>
                <th>شماره</th>
                <th>شرح</th>
                <th>مبلغ کل</th>
                <th>وضعیت</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invoice in overview.invoices" :key="invoice.id">
                <td dir="ltr" style="text-align: end">{{ invoice.number }}</td>
                <td>
                  {{ invoice.description }}
                  <small class="muted-text" style="display: block">{{
                    faDate(invoice.created_at)
                  }}</small>
                </td>
                <td>{{ faMoney(invoice.total) }}</td>
                <td><StatusBadge :status="invoiceStatuses[invoice.status]" /></td>
              </tr>
            </tbody>
          </table>
          <p class="card__note">{{ overview.payment_instructions }}</p>
        </section>
        <aside>
          <section class="card">
            <h2><q-icon name="workspace_premium" />اشتراک‌ها</h2>
            <p v-if="!overview.subscriptions.length" class="muted-text">اشتراکی ندارید.</p>
            <div v-for="item in overview.subscriptions" :key="item.id" class="review-item">
              <div>
                {{ item.label }} · {{ item.subject.name }}
                <small v-if="item.ends_at">تا {{ faDate(item.ends_at) }}</small>
              </div>
              <StatusBadge :status="subscriptionStatuses[item.status]" />
            </div>
            <p class="card__note">{{ faNumber(overview.subscriptions.length) }} اشتراک ثبت‌شده</p>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
