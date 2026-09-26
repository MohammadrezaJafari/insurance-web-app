<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import { ApiError, commissionRules, createCommissionRule, deleteCommissionRule } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useDirectoryStore } from '../stores/directory';
import { errorMessage, faDate, faNumber } from '../format';
import { localIsoDate } from '../jalali';
import type { CommissionRule, ProfileRef } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import InsurerNav from '../components/InsurerNav.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';

useMeta({
  title: 'نرخ کارمزد | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const requireAuth = useRequireAuth();
const directory = useDirectoryStore();
const rules = ref<CommissionRule[] | null>(null);
const insurer = ref<ProfileRef | null>(null);
const error = ref('');
const formError = ref('');
const busy = ref(false);
const draft = reactive<{
  insurance_line: string | null;
  rate: number | null;
  valid_from: string | null;
  valid_until: string | null;
  note: string | null;
}>({ insurance_line: null, rate: null, valid_from: localIsoDate(), valid_until: null, note: null });

async function load(): Promise<void> {
  try {
    const result = await commissionRules(route.query.insurer as string | undefined);
    rules.value = result.data;
    insurer.value = result.insurer;
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'دریافت نرخ‌ها ممکن نشد.';
  }
}
async function save(): Promise<void> {
  if (!insurer.value || draft.rate === null || !draft.valid_from) return;
  busy.value = true;
  formError.value = '';
  try {
    await createCommissionRule(insurer.value.slug, {
      ...draft,
      rate: draft.rate,
      valid_from: draft.valid_from,
    });
    Object.assign(draft, { insurance_line: null, rate: null, valid_until: null, note: null });
    await load();
  } catch (exception) {
    formError.value = errorMessage(exception, 'ثبت ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
async function remove(rule: CommissionRule): Promise<void> {
  if (!window.confirm('این نرخ حذف شود؟ کارمزد بیمه‌نامه‌های تأییدشده تغییر نمی‌کند.')) return;
  await deleteCommissionRule(rule.id);
  await load();
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  await Promise.all([load(), directory.loadTaxonomy().catch(() => undefined)]);
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">شرکت بیمه</div>
        <h1>نرخ کارمزد شبکه{{ insurer ? ` · ${insurer.name}` : '' }}</h1>
      </div>
    </div>
    <InsurerNav />

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!rules" class="skeleton" style="height: 240px" />
    <div v-else class="profile-grid">
      <div>
        <section class="card">
          <h2><q-icon name="percent" />نرخ‌های تعریف‌شده</h2>
          <p v-if="!rules.length" class="muted-text">
            هنوز نرخی تعریف نشده؛ کارمزد نمایندگان محاسبه نمی‌شود.
          </p>
          <table v-else class="line-table">
            <thead>
              <tr>
                <th>رشته</th>
                <th>نرخ</th>
                <th>از</th>
                <th>تا</th>
                <th><span class="sr-only">اقدام</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rule in rules" :key="rule.id" :style="{ opacity: rule.active ? 1 : 0.55 }">
                <td>
                  {{ rule.insurance_line ?? 'همهٔ رشته‌ها (پیش‌فرض)' }}
                  <small v-if="rule.note" class="muted-text" style="display: block">{{
                    rule.note
                  }}</small>
                </td>
                <td>{{ faNumber(rule.rate) }}٪</td>
                <td>{{ faDate(rule.valid_from) }}</td>
                <td>{{ rule.valid_until ? faDate(rule.valid_until) : 'نامحدود' }}</td>
                <td>
                  <button class="btn btn--ghost" aria-label="حذف" @click="remove(rule)">
                    <q-icon name="delete" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <p class="card__note">
            نرخ هر بیمه‌نامه از قاعدهٔ همان رشته (یا در نبود آن، قاعدهٔ پیش‌فرض) در تاریخ شروع
            بیمه‌نامه گرفته می‌شود. نرخ جدید برای یک رشته، نرخ نامحدود قبلی همان رشته را از روز
            شروعش می‌بندد.
          </p>
        </section>
      </div>
      <aside>
        <form class="card" @submit.prevent="save">
          <h2><q-icon name="add" />نرخ جدید</h2>
          <label class="field-label">
            رشته
            <select v-model="draft.insurance_line" class="select">
              <option :value="null">همهٔ رشته‌ها (پیش‌فرض)</option>
              <option v-for="line in directory.taxonomy?.insurance_lines ?? []" :key="line">
                {{ line }}
              </option>
            </select>
          </label>
          <label class="field-label">
            نرخ (درصد حق بیمه)
            <input
              v-model.number="draft.rate"
              class="input"
              type="number"
              step="0.01"
              min="0"
              max="40"
              dir="ltr"
              required
            />
          </label>
          <label class="field-label"
            >معتبر از<JalaliDateInput v-model="draft.valid_from" required
          /></label>
          <label class="field-label"
            >تا (اختیاری)<JalaliDateInput v-model="draft.valid_until"
          /></label>
          <label class="field-label">
            توضیح<input
              v-model="draft.note"
              class="input"
              maxlength="255"
              placeholder="مثلاً: مصوبهٔ هیئت‌مدیره"
            />
          </label>
          <div v-if="formError" class="notice notice--error">{{ formError }}</div>
          <button class="btn btn--primary btn--block" :disabled="busy">ثبت نرخ</button>
        </form>
      </aside>
    </div>
  </main>
  <SiteFooter />
</template>
