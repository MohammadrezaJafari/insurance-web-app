<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { myRequests } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { faDate, faMoneyShort, faNumber, requestStatuses } from '../format';
import type { RequestSummary } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'استعلام‌های من | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const requests = ref<RequestSummary[] | null>(null);
const error = ref('');

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    requests.value = await myRequests();
  } catch {
    error.value = 'دریافت فهرست ممکن نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">استعلام بیمه</div>
        <h1>استعلام‌های من</h1>
      </div>
      <router-link to="/requests/new" class="btn btn--primary"
        ><q-icon name="add" size="18px" />استعلام جدید</router-link
      >
    </div>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!requests" class="result-list">
      <div v-for="n in 3" :key="n" class="skeleton" />
    </div>
    <div v-else-if="!requests.length" class="state">
      <q-icon name="request_quote" />
      هنوز استعلامی ثبت نکرده‌اید. نیاز بیمه‌ای خود را ثبت کنید تا ارائه‌دهندگان بررسی‌شده پیشنهاد
      بدهند.
      <div style="margin-top: 14px">
        <router-link to="/requests/new" class="btn btn--amber">ثبت اولین استعلام</router-link>
      </div>
    </div>
    <div v-else class="result-list">
      <router-link
        v-for="item in requests"
        :key="item.reference"
        :to="
          item.status === 'draft'
            ? `/requests/${item.reference}/edit`
            : `/requests/${item.reference}`
        "
        class="actor-row"
      >
        <span class="tile tone-blue"><q-icon name="request_quote" /></span>
        <div class="actor-row__body">
          <div class="actor-row__title">
            <h3>{{ item.title }}</h3>
            <StatusBadge :status="requestStatuses[item.status]" />
          </div>
          <div class="actor-row__meta">
            {{ item.insurance_line }} · {{ item.province }}
            <template v-if="item.coverage_amount">
              · تعهد {{ faMoneyShort(item.coverage_amount) }}</template
            >
            · {{ faDate(item.created_at) }}
          </div>
          <div class="chips">
            <span class="chip">{{ faNumber(item.invitations_count ?? 0) }} دعوت</span>
            <span class="chip">{{ faNumber(item.proposals_count ?? 0) }} پیشنهاد</span>
          </div>
        </div>
        <q-icon name="chevron_left" size="24px" class="actor-row__arrow" />
      </router-link>
    </div>
  </main>
  <SiteFooter />
</template>
