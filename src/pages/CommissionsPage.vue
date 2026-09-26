<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { agentCommissions } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { confirmationStatuses, faDate, faMoneyShort, faNumber } from '../format';
import type { AgentCommissions } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import CrmNav from '../components/CrmNav.vue';
import IncentiveProgress from '../components/IncentiveProgress.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'کارمزد و جشنواره | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const data = ref<AgentCommissions | null>(null);
const error = ref('');

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    data.value = await agentCommissions();
  } catch {
    error.value = 'دریافت اطلاعات کارمزد ممکن نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">مدیریت کسب‌وکار</div>
        <h1>کارمزد و جشنواره‌ها</h1>
      </div>
    </div>
    <CrmNav />

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!data" class="skeleton" style="height: 320px" />
    <template v-else>
      <div class="kpi-row">
        <div class="kpi">
          <span>کارمزد قطعی</span><b>{{ faMoneyShort(data.totals.confirmed) || '—' }}</b>
        </div>
        <div class="kpi">
          <span>کارمزد برآوردی (در انتظار تأیید)</span>
          <b>{{ faMoneyShort(data.totals.pending) || '—' }}</b>
        </div>
        <div class="kpi" :class="{ 'kpi--alert': data.totals.awaiting_confirmation > 0 }">
          <span>بیمه‌نامهٔ در انتظار تأیید</span>
          <b>{{ faNumber(data.totals.awaiting_confirmation) }}</b>
        </div>
        <div class="kpi">
          <span>رد شده</span><b>{{ faNumber(data.totals.rejected) }}</b>
        </div>
      </div>
      <p class="muted-text" style="margin-top: -6px">
        کارمزد بر اساس نرخی محاسبه می‌شود که شرکت بیمه برای رشته و تاریخ شروع بیمه‌نامه تعریف کرده
        است و فقط پس از تأیید بیمه‌نامه توسط همان شرکت قطعی می‌شود.
      </p>

      <section v-if="data.incentives.length">
        <h2 class="section-title">جشنواره‌های فروش شرکت‌های طرف همکاری</h2>
        <div class="card-grid">
          <IncentiveProgress
            v-for="program in data.incentives"
            :key="program.id"
            :program="program"
          />
        </div>
      </section>

      <div class="profile-grid">
        <div>
          <section class="card">
            <h2><q-icon name="receipt_long" />بیمه‌نامه‌ها و کارمزد</h2>
            <p v-if="!data.policies.length" class="muted-text">
              بیمه‌نامه‌ای که به یک شرکت بیمهٔ اینشورهاب وصل باشد ثبت نکرده‌اید.
            </p>
            <div v-else class="compare-scroll">
              <table class="compare data-table">
                <thead>
                  <tr>
                    <th scope="col">مشتری و رشته</th>
                    <th scope="col">حق بیمه</th>
                    <th scope="col">کارمزد</th>
                    <th scope="col">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="policy in data.policies" :key="policy.id">
                    <td>
                      <router-link :to="`/crm/clients/${policy.client_id}`" class="link">
                        {{ policy.client }}
                      </router-link>
                      <small class="muted-text" style="display: block">
                        {{ policy.insurance_line }} · {{ policy.insurer }} ·
                        {{ faDate(policy.starts_on) }}
                      </small>
                    </td>
                    <td>{{ faMoneyShort(policy.premium) }}</td>
                    <td>
                      <template v-if="policy.commission.amount !== null">
                        {{ faMoneyShort(policy.commission.amount) || '۰' }}
                        <small class="muted-text" style="display: block">
                          {{ faNumber(policy.commission.rate ?? 0) }}٪
                          {{ policy.commission.final ? '' : '· برآوردی' }}
                        </small>
                      </template>
                      <small v-else class="muted-text">
                        {{ policy.confirmation === 'rejected' ? '—' : 'نرخ تعریف نشده' }}
                      </small>
                    </td>
                    <td>
                      <StatusBadge
                        v-if="policy.confirmation"
                        :status="confirmationStatuses[policy.confirmation]"
                      />
                      <small
                        v-if="policy.confirmation_note"
                        class="muted-text"
                        style="display: block"
                      >
                        {{ policy.confirmation_note }}
                      </small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
        <aside>
          <section class="card">
            <h2><q-icon name="apartment" />به تفکیک شرکت</h2>
            <p v-if="!data.by_insurer.length" class="muted-text">داده‌ای نیست.</p>
            <div v-for="row in data.by_insurer" :key="row.insurer.slug" class="review-item">
              <div>
                {{ row.insurer.name }}
                <small>
                  قطعی {{ faMoneyShort(row.confirmed) || '۰' }} · برآوردی
                  {{ faMoneyShort(row.pending) || '۰' }} · {{ faNumber(row.policies) }} بیمه‌نامه
                </small>
                <small v-if="row.without_rule" style="color: var(--amber-strong)">
                  {{ faNumber(row.without_rule) }} بیمه‌نامه بدون نرخ کارمزد تعریف‌شده
                </small>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
