<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { cancelPolicy, exportPolicies, importPolicies, listPolicies, myProfiles } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import {
  confirmationStatuses,
  crmStages,
  errorMessage,
  faDate,
  faMoneyShort,
  faNumber,
  policyStatuses,
} from '../format';
import type { Policy, PolicyMeta, ProfileRef } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import CrmNav from '../components/CrmNav.vue';
import CsvImportDialog from '../components/CsvImportDialog.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'بیمه‌نامه‌ها و تمدید | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const router = useRouter();
const requireAuth = useRequireAuth();
const items = ref<Policy[] | null>(null);
const meta = ref<PolicyMeta | null>(null);
const profiles = ref<ProfileRef[]>([]);
const error = ref('');
const actionError = ref('');
const importing = ref(false);
const cancelling = ref<Policy | null>(null);
const cancelReason = ref('');
const search = ref(String(route.query.q ?? ''));
const view = computed(() => (route.query.view === 'renewals' ? 'renewals' : 'all'));
const status = ref(String(route.query.status ?? ''));

async function load(): Promise<void> {
  const params = new URLSearchParams();
  if (view.value === 'renewals')
    params.set('due_days', String(meta.value?.renewal_window_days ?? 30));
  else if (status.value) params.set('status', status.value);
  if (search.value.trim()) params.set('q', search.value.trim());
  try {
    const result = await listPolicies(params);
    items.value = result.data;
    meta.value = result.meta;
  } catch {
    error.value = 'دریافت بیمه‌نامه‌ها ممکن نشد.';
  }
}
function setView(value: 'all' | 'renewals'): void {
  void router.replace({
    query: { ...route.query, view: value === 'renewals' ? 'renewals' : undefined },
  });
}
function applyFilters(): void {
  void router.replace({
    query: {
      view: route.query.view,
      q: search.value.trim() || undefined,
      status: status.value || undefined,
    },
  });
}
async function confirmCancel(): Promise<void> {
  if (!cancelling.value) return;
  try {
    await cancelPolicy(cancelling.value.id, cancelReason.value);
    cancelling.value = null;
    await load();
  } catch (exception) {
    actionError.value = errorMessage(exception);
  }
}
async function runExport(): Promise<void> {
  try {
    await exportPolicies();
  } catch {
    error.value = 'دریافت خروجی ممکن نشد.';
  }
}

watch(
  () => route.query,
  () => void load(),
);
onMounted(async () => {
  if (!(await requireAuth())) return;
  await load();
  profiles.value = (await myProfiles().catch(() => []))
    .filter((profile) => profile.type === 'broker' || profile.type === 'agency')
    .map(({ name, slug }) => ({ name, slug }));
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">مدیریت کسب‌وکار</div>
        <h1>بیمه‌نامه‌ها و تمدید</h1>
      </div>
      <div class="stack-row">
        <button class="btn btn--outline" :disabled="!profiles.length" @click="importing = true">
          <q-icon name="upload" size="18px" />ورود از فایل
        </button>
        <button class="btn btn--outline" :disabled="!items?.length" @click="runExport">
          <q-icon name="download" size="18px" />خروجی CSV
        </button>
        <router-link to="/crm/clients" class="btn btn--primary">
          <q-icon name="note_add" size="18px" />ثبت از صفحهٔ مشتری
        </router-link>
      </div>
    </div>
    <CrmNav />

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!items || !meta" class="skeleton" style="height: 320px" />
    <template v-else>
      <div class="kpi-row">
        <div class="kpi">
          <span>بیمه‌نامهٔ فعال</span><b>{{ faNumber(meta.active_count) }}</b>
        </div>
        <div class="kpi">
          <span>حق بیمهٔ فعال</span><b>{{ faMoneyShort(meta.active_premium) || '—' }}</b>
        </div>
        <div class="kpi" :class="{ 'kpi--alert': meta.due_count > 0 }">
          <span>سررسید تا {{ faNumber(meta.renewal_window_days) }} روز</span>
          <b>{{ faNumber(meta.due_count) }}</b>
        </div>
      </div>

      <div class="segmented" role="tablist" style="max-width: 360px; margin-bottom: 12px">
        <button
          role="tab"
          :aria-selected="view === 'all'"
          :class="{ active: view === 'all' }"
          @click="setView('all')"
        >
          همه
        </button>
        <button
          role="tab"
          :aria-selected="view === 'renewals'"
          :class="{ active: view === 'renewals' }"
          @click="setView('renewals')"
        >
          تمدیدهای پیش رو
        </button>
      </div>

      <form class="toolbar" @submit.prevent="applyFilters">
        <div class="header-search" style="max-width: 320px">
          <q-icon name="search" size="18px" />
          <input
            v-model="search"
            placeholder="نام مشتری یا شمارهٔ بیمه‌نامه"
            aria-label="جست‌وجو"
          />
        </div>
        <select
          v-if="view === 'all'"
          v-model="status"
          class="select"
          style="width: auto; margin: 0"
          aria-label="وضعیت"
          @change="applyFilters"
        >
          <option value="">همه وضعیت‌ها</option>
          <option v-for="(label, key) in meta.statuses" :key="key" :value="key">{{ label }}</option>
        </select>
      </form>
      <div v-if="actionError" class="notice notice--error">{{ actionError }}</div>

      <div v-if="!items.length" class="state">
        <q-icon name="description" />
        {{
          view === 'renewals'
            ? `بیمه‌نامه‌ای در ${faNumber(meta.renewal_window_days)} روز آینده سررسید نمی‌شود.`
            : 'بیمه‌نامه‌ای ثبت نشده است. از صفحهٔ هر مشتری یا با ورود فایل ثبت کنید.'
        }}
      </div>
      <div v-else class="card compare-scroll" style="padding: 0">
        <table class="compare data-table">
          <thead>
            <tr>
              <th scope="col">مشتری</th>
              <th scope="col">رشته و شرکت</th>
              <th scope="col">حق بیمه</th>
              <th scope="col">پایان</th>
              <th scope="col">وضعیت</th>
              <th scope="col">تمدید</th>
              <th scope="col"><span class="sr-only">اقدام</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="policy in items" :key="policy.id">
              <td>
                <router-link
                  v-if="policy.client"
                  :to="`/crm/clients/${policy.client.id}`"
                  class="link"
                >
                  {{ policy.client.name }}
                </router-link>
                <small
                  v-if="policy.policy_number"
                  class="muted-text"
                  dir="ltr"
                  style="display: block"
                >
                  {{ policy.policy_number }}
                </small>
              </td>
              <td>
                {{ policy.insurance_line }}
                <small class="muted-text" style="display: block">{{ policy.insurer || '—' }}</small>
              </td>
              <td>{{ faMoneyShort(policy.premium) }}</td>
              <td>
                {{ faDate(policy.ends_on) }}
                <small
                  v-if="policy.days_left !== null"
                  class="days-left"
                  :class="{ 'days-left--soon': policy.days_left <= 7 }"
                  style="display: block"
                >
                  {{ policy.days_left < 0 ? 'گذشته' : `${faNumber(policy.days_left)} روز مانده` }}
                </small>
              </td>
              <td>
                <StatusBadge :status="policyStatuses[policy.status]" />
                <StatusBadge
                  v-if="policy.confirmation"
                  :status="confirmationStatuses[policy.confirmation]"
                  style="margin-top: 4px"
                />
              </td>
              <td>
                <router-link
                  v-if="policy.renewal_opportunity"
                  :to="`/crm/${policy.renewal_opportunity.id}`"
                  class="link"
                >
                  {{
                    policy.renewal_opportunity.stage
                      ? crmStages[policy.renewal_opportunity.stage]!.label
                      : 'فرصت تمدید'
                  }}
                </router-link>
                <span v-else class="muted-text">—</span>
              </td>
              <td>
                <button
                  v-if="policy.status === 'active'"
                  class="btn btn--ghost"
                  aria-label="لغو بیمه‌نامه"
                  @click="
                    cancelling = policy;
                    cancelReason = '';
                  "
                >
                  <q-icon name="block" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint">
        فرصت تمدید {{ faNumber(meta.renewal_window_days) }} روز پیش از پایان هر بیمه‌نامهٔ فعال
        به‌طور خودکار در صندوق فرصت‌ها باز و اعلان می‌شود.
      </p>
    </template>

    <q-dialog :model-value="cancelling !== null" @update:model-value="cancelling = null">
      <form class="dialog-card" @submit.prevent="confirmCancel">
        <h2>لغو بیمه‌نامه</h2>
        <p>{{ cancelling?.client?.name }} · {{ cancelling?.insurance_line }}</p>
        <select v-model="cancelReason" class="select" required aria-label="علت لغو">
          <option value="" disabled>علت لغو</option>
          <option v-for="reason in meta?.cancel_reasons" :key="reason">{{ reason }}</option>
        </select>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="cancelling = null">انصراف</button>
          <button class="btn btn--primary" :disabled="!cancelReason">لغو بیمه‌نامه</button>
        </div>
      </form>
    </q-dialog>

    <CsvImportDialog
      v-model="importing"
      title="ورود بیمه‌نامه‌ها از CSV"
      :profiles="profiles"
      :upload="importPolicies"
      @imported="load"
    >
      ستون‌های الزامی: <code>client_name</code>، <code>insurance_line</code>، <code>premium</code>،
      <code>starts_on</code>، <code>ends_on</code> (تاریخ شمسی مانند ۱۴۰۵/۰۱/۱۵ یا میلادی). اختیاری:
      <code>client_phone</code>، <code>insurer</code>، <code>policy_number</code>. مشتری با همان نام
      و تلفن دوباره ساخته نمی‌شود.
    </CsvImportDialog>
  </main>
  <SiteFooter />
</template>
