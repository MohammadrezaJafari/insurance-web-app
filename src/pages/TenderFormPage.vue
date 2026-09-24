<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, createTender, getTender, myOrganizations, updateTender } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useTenderMeta } from '../composables/useTenderMeta';
import { faMoneyShort, faNumber } from '../format';
import type { OrganizationSummary, TenderDraft } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import JalaliDateTimeInput from '../components/JalaliDateTimeInput.vue';
import TenderDisclaimer from '../components/TenderDisclaimer.vue';

useMeta({
  title: 'تعریف مناقصه | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const router = useRouter();
const requireAuth = useRequireAuth();
const { meta, load: loadMeta } = useTenderMeta();
const reference = typeof route.params.reference === 'string' ? route.params.reference : '';
const organizations = ref<OrganizationSummary[]>([]);
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const fieldErrors = ref<Record<string, string[]>>({});
const form = reactive<TenderDraft>({
  title: '',
  insurance_line: '',
  description: '',
  coverage_amount: null,
  questions_deadline_at: null,
  submission_deadline_at: null,
  weights: {},
});

const weightSum = computed(() =>
  Object.values(form.weights).reduce((sum, value) => sum + (Number(value) || 0), 0),
);
const errorFor = (key: string) => fieldErrors.value[key]?.[0];

async function save(): Promise<void> {
  busy.value = true;
  error.value = '';
  fieldErrors.value = {};
  try {
    const saved = reference ? await updateTender(reference, form) : await createTender(form);
    await router.push(`/tenders/${saved.reference}`);
  } catch (exception) {
    if (exception instanceof ApiError) {
      fieldErrors.value = exception.errors;
      error.value = Object.keys(exception.errors).length
        ? 'برخی فیلدها نیاز به اصلاح دارند.'
        : exception.message;
    } else {
      error.value = 'ذخیره ممکن نشد.';
    }
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  const settings = await loadMeta();
  if (!settings) {
    error.value = 'این بخش فعال نیست.';
    loading.value = false;
    return;
  }
  form.weights = Object.fromEntries(
    Object.entries(settings.criteria).map(([key, item]) => [key, item.weight]),
  );
  try {
    organizations.value = (await myOrganizations()).filter((org) =>
      ['owner', 'manager'].includes(org.role),
    );
    form.organization_id = organizations.value[0]?.id;
    if (reference) {
      const tender = await getTender(reference);
      if (tender.status !== 'draft' || !tender.can.manage) {
        await router.replace(`/tenders/${reference}`);
        return;
      }
      Object.assign(form, {
        title: tender.title,
        insurance_line: tender.insurance_line,
        description: tender.description,
        coverage_amount: tender.coverage_amount,
        questions_deadline_at: tender.questions_deadline_at,
        submission_deadline_at: tender.submission_deadline_at,
        weights: Object.fromEntries(
          Object.entries(tender.criteria).map(([key, item]) => [key, item.weight]),
        ),
      });
    }
  } catch {
    error.value = 'دریافت اطلاعات ممکن نشد.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/tenders">مناقصه‌ها</router-link>
      <q-icon name="chevron_left" />
      <span>{{ reference ? 'ویرایش پیش‌نویس' : 'مناقصهٔ جدید' }}</span>
    </nav>
    <header class="flow-head">
      <div class="eyebrow">استعلام سازمانی</div>
      <h1>{{ reference ? 'ویرایش مناقصه' : 'تعریف مناقصهٔ بیمه' }}</h1>
      <p>
        پس از انتشار، مشخصات قفل می‌شود و هر اصلاح باید با نسخهٔ جدید سند اعلام شود تا همهٔ
        شرکت‌کنندگان شرایط یکسان داشته باشند.
      </p>
    </header>
    <TenderDisclaimer />

    <div v-if="loading" class="skeleton" style="height: 320px" />
    <div v-else-if="!meta" class="state state--error">{{ error }}</div>
    <div v-else-if="!reference && !organizations.length" class="state">
      برای تعریف مناقصه باید مالک یا مدیر یک سازمان خریدار باشید.
      <div style="margin-top: 12px">
        <router-link to="/tenders" class="btn btn--outline">ثبت سازمان</router-link>
      </div>
    </div>
    <form v-else class="flow-grid" @submit.prevent="save">
      <div>
        <section class="card">
          <h2><span class="step-no">۱</span>موضوع</h2>
          <label v-if="!reference && organizations.length > 1" class="field-label">
            سازمان
            <select v-model="form.organization_id" class="select" required>
              <option v-for="org in organizations" :key="org.id" :value="org.id">
                {{ org.name }}
              </option>
            </select>
          </label>
          <label class="field-label">
            عنوان<span class="req">*</span>
            <input v-model="form.title" class="input" required minlength="5" maxlength="255" />
            <span v-if="errorFor('title')" class="field-error">{{ errorFor('title') }}</span>
          </label>
          <div class="form-row">
            <label class="field-label">
              رشتهٔ بیمه<span class="req">*</span>
              <select v-model="form.insurance_line" class="select" required>
                <option value="" disabled>انتخاب کنید</option>
                <option v-for="line in meta.insurance_lines" :key="line">{{ line }}</option>
              </select>
            </label>
            <label class="field-label">
              سقف تعهد مورد نظر (ریال)
              <input
                v-model.number="form.coverage_amount"
                class="input"
                type="number"
                min="0"
                dir="ltr"
              />
              <small v-if="form.coverage_amount" class="hint">{{
                faMoneyShort(form.coverage_amount)
              }}</small>
            </label>
          </div>
          <label class="field-label">
            شرح نیاز و شرایط<span class="req">*</span>
            <textarea
              v-model="form.description"
              class="textarea"
              style="min-height: 200px"
              required
              minlength="30"
              maxlength="20000"
            />
            <span v-if="errorFor('description')" class="field-error">{{
              errorFor('description')
            }}</span>
          </label>
        </section>

        <section class="card">
          <h2><span class="step-no">۲</span>معیارهای ارزیابی</h2>
          <p class="muted-text">
            وزن‌ها پیش از انتشار به شرکت‌کنندگان اعلام می‌شود و جمع آن‌ها باید ۱۰۰ باشد.
          </p>
          <div class="weights">
            <label v-for="(criterion, key) in meta.criteria" :key="key" class="field-label">
              {{ criterion.label }}
              <input
                v-model.number="form.weights[key]"
                class="input"
                type="number"
                min="0"
                max="100"
                dir="ltr"
              />
            </label>
          </div>
          <div class="notice" :class="weightSum === 100 ? '' : 'notice--error'">
            جمع وزن‌ها: {{ faNumber(weightSum) }} از ۱۰۰
          </div>
        </section>
      </div>

      <aside>
        <section class="card sticky-card">
          <h2><span class="step-no">۳</span>زمان‌بندی</h2>
          <label class="field-label">
            پایان مهلت پرسش
            <JalaliDateTimeInput v-model="form.questions_deadline_at" label="مهلت پرسش" />
            <span v-if="errorFor('questions_deadline_at')" class="field-error">{{
              errorFor('questions_deadline_at')
            }}</span>
          </label>
          <label class="field-label">
            پایان مهلت ارسال پیشنهاد
            <JalaliDateTimeInput v-model="form.submission_deadline_at" label="مهلت پیشنهاد" />
            <span v-if="errorFor('submission_deadline_at')" class="field-error">{{
              errorFor('submission_deadline_at')
            }}</span>
          </label>
          <p class="card__note">
            پیشنهادها تا پایان این مهلت مهر و موم‌اند و حتی برای سازمان شما قابل مشاهده نیستند.
          </p>
          <div v-if="error" class="notice notice--error">{{ error }}</div>
          <button class="btn btn--primary btn--block" style="margin-top: 12px" :disabled="busy">
            ذخیرهٔ پیش‌نویس
          </button>
        </section>
      </aside>
    </form>
  </main>
  <SiteFooter />
</template>
