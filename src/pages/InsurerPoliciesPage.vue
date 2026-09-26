<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, confirmPolicy, insurerPolicies, rejectPolicy } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { errorMessage, faDate, faMoneyShort, faNumber } from '../format';
import type { InsurerPolicy, PolicyConfirmation, ProfileRef } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import InsurerNav from '../components/InsurerNav.vue';

useMeta({
  title: 'تأیید بیمه‌نامه‌های شبکه | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const router = useRouter();
const requireAuth = useRequireAuth();
const items = ref<InsurerPolicy[] | null>(null);
const insurer = ref<ProfileRef | null>(null);
const counts = ref<Partial<Record<string, number>>>({});
const status = ref(String(route.query.status ?? 'self_reported'));
const error = ref('');
const actionError = ref('');
const busy = ref<number | null>(null);
const rejecting = ref<InsurerPolicy | null>(null);
const note = ref('');
const tabs: { key: Exclude<PolicyConfirmation, null>; label: string }[] = [
  { key: 'self_reported', label: 'در انتظار تأیید' },
  { key: 'confirmed', label: 'تأییدشده' },
  { key: 'rejected', label: 'ردشده' },
];

async function load(): Promise<void> {
  try {
    const result = await insurerPolicies(route.query.insurer as string | undefined, status.value);
    items.value = result.data;
    insurer.value = result.insurer;
    counts.value = result.counts;
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'دریافت فهرست ممکن نشد.';
  }
}
function setStatus(value: string): void {
  status.value = value;
  void router.replace({ query: { ...route.query, status: value } });
}
async function confirm(policy: InsurerPolicy): Promise<void> {
  busy.value = policy.id;
  actionError.value = '';
  try {
    await confirmPolicy(policy.id);
    await load();
  } catch (exception) {
    actionError.value = errorMessage(exception);
  } finally {
    busy.value = null;
  }
}
async function reject(): Promise<void> {
  if (!rejecting.value) return;
  busy.value = rejecting.value.id;
  try {
    await rejectPolicy(rejecting.value.id, note.value);
    rejecting.value = null;
    await load();
  } catch (exception) {
    actionError.value = errorMessage(exception);
  } finally {
    busy.value = null;
  }
}

watch(
  () => route.query.status,
  () => void load(),
);
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
        <h1>تأیید بیمه‌نامه‌های شبکه{{ insurer ? ` · ${insurer.name}` : '' }}</h1>
      </div>
    </div>
    <InsurerNav />
    <p class="muted-text" style="margin-top: -6px">
      بیمه‌نامه‌هایی که نمایندگان با وابستگی بررسی‌شده به نام این شرکت ثبت کرده‌اند. با تأیید،
      کارمزد بر اساس نرخ روز شروع بیمه‌نامه قطعی می‌شود. هویت بیمه‌گذار در این صفحه نمایش داده
      نمی‌شود؛ برای تطبیق از شمارهٔ بیمه‌نامه استفاده کنید.
    </p>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <template v-else>
      <div class="segmented" role="tablist" style="max-width: 520px; margin-bottom: 12px">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          role="tab"
          :aria-selected="status === tab.key"
          :class="{ active: status === tab.key }"
          @click="setStatus(tab.key)"
        >
          {{ tab.label }} ({{ faNumber(counts[tab.key] ?? 0) }})
        </button>
      </div>
      <div v-if="actionError" class="notice notice--error">{{ actionError }}</div>
      <div v-if="!items" class="skeleton" style="height: 240px" />
      <div v-else-if="!items.length" class="state">
        <q-icon name="fact_check" />موردی در این فهرست نیست.
      </div>
      <div v-else class="card compare-scroll" style="padding: 0">
        <table class="compare data-table">
          <thead>
            <tr>
              <th scope="col">نماینده</th>
              <th scope="col">شمارهٔ بیمه‌نامه</th>
              <th scope="col">رشته</th>
              <th scope="col">حق بیمه</th>
              <th scope="col">اعتبار</th>
              <th scope="col">کارمزد</th>
              <th scope="col"><span class="sr-only">اقدام</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="policy in items" :key="policy.id">
              <td>
                <router-link :to="`/profiles/${policy.agent.slug}`" class="link">
                  {{ policy.agent.name }}
                </router-link>
              </td>
              <td dir="ltr" style="text-align: end">{{ policy.policy_number || '—' }}</td>
              <td>{{ policy.insurance_line }}</td>
              <td>{{ faMoneyShort(policy.premium) }}</td>
              <td>{{ faDate(policy.starts_on) }} تا {{ faDate(policy.ends_on) }}</td>
              <td>
                <template v-if="policy.commission.amount !== null">
                  {{ faMoneyShort(policy.commission.amount) || '۰' }}
                  <small class="muted-text">({{ faNumber(policy.commission.rate ?? 0) }}٪)</small>
                </template>
                <small v-else class="muted-text">بدون نرخ</small>
                <small v-if="policy.confirmation_note" class="muted-text" style="display: block">
                  {{ policy.confirmation_note }}
                </small>
              </td>
              <td>
                <div v-if="policy.confirmation === 'self_reported'" class="stack-row">
                  <button
                    class="btn btn--primary"
                    :disabled="busy === policy.id"
                    @click="confirm(policy)"
                  >
                    تأیید
                  </button>
                  <button
                    class="btn btn--ghost"
                    :disabled="busy === policy.id"
                    @click="
                      rejecting = policy;
                      note = '';
                    "
                  >
                    رد
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <q-dialog :model-value="rejecting !== null" @update:model-value="rejecting = null">
      <form class="dialog-card" @submit.prevent="reject">
        <h2>رد بیمه‌نامه</h2>
        <p>
          {{ rejecting?.agent.name }} · {{ rejecting?.policy_number || 'بدون شماره' }}. علت برای
          نماینده ارسال می‌شود.
        </p>
        <input
          v-model="note"
          class="input"
          required
          minlength="3"
          maxlength="255"
          placeholder="مثلاً: شماره در سامانهٔ صدور پیدا نشد"
          aria-label="علت رد"
        />
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="rejecting = null">انصراف</button>
          <button class="btn btn--primary" :disabled="note.trim().length < 3">ثبت رد</button>
        </div>
      </form>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
