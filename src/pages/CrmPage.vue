<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import {
  ApiError,
  createOpportunity,
  exportOpportunities,
  importOpportunities,
  listOpportunities,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { crmStages, faDate, faMoneyShort, faNumber, leadSources, openStages } from '../format';
import type { Opportunity, OpportunityDraft, PipelineMeta, Stage } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';
import CrmNav from '../components/CrmNav.vue';

useMeta({
  title: 'صندوق فرصت‌ها | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const router = useRouter();
const requireAuth = useRequireAuth();
const items = ref<Opportunity[] | null>(null);
const meta = ref<PipelineMeta | null>(null);
const error = ref('');
const search = ref(String(route.query.q ?? ''));
const source = ref(String(route.query.source ?? ''));
const showClosed = ref(false);

const creating = ref(false);
const importing = ref(false);
const busy = ref(false);
const formError = ref('');
const profile = ref('');
const importFile = ref<File | null>(null);
const importResult = ref<{ created: number; errors: { row: number; message: string }[] } | null>(
  null,
);
const draft = reactive<OpportunityDraft>({
  title: '',
  insurance_line: null,
  contact_name: null,
  contact_phone: null,
  contact_email: null,
  estimated_premium: null,
  expected_close_date: null,
});

const columns = computed<Stage[]>(() =>
  showClosed.value ? [...openStages, 'won', 'lost'] : [...openStages],
);
const byStage = computed(() => {
  const groups: Record<string, Opportunity[]> = {};
  for (const item of items.value ?? []) (groups[item.stage] ??= []).push(item);
  return groups;
});
const multipleProfiles = computed(() => (meta.value?.profiles.length ?? 0) > 1);

async function load(): Promise<void> {
  const params = new URLSearchParams();
  if (search.value.trim()) params.set('q', search.value.trim());
  if (source.value) params.set('source', source.value);
  try {
    const result = await listOpportunities(params);
    items.value = result.data;
    meta.value = result.meta;
    profile.value ||= result.meta.profiles[0]?.slug ?? '';
  } catch {
    error.value = 'دریافت فرصت‌ها ممکن نشد.';
  }
}
function applyFilters(): void {
  void router.replace({
    query: { q: search.value.trim() || undefined, source: source.value || undefined },
  });
}

async function create(): Promise<void> {
  busy.value = true;
  formError.value = '';
  try {
    const created = await createOpportunity(profile.value, draft);
    await router.push(`/crm/${created.id}`);
  } catch (exception) {
    formError.value =
      exception instanceof ApiError
        ? (Object.values(exception.errors)[0]?.[0] ?? exception.message)
        : 'ثبت ممکن نشد.';
  } finally {
    busy.value = false;
  }
}
function pickFile(event: Event): void {
  importFile.value = (event.target as HTMLInputElement).files?.[0] ?? null;
}
async function runImport(): Promise<void> {
  if (!importFile.value) return;
  busy.value = true;
  formError.value = '';
  try {
    importResult.value = await importOpportunities(profile.value, importFile.value);
    await load();
  } catch (exception) {
    formError.value =
      exception instanceof ApiError
        ? (Object.values(exception.errors)[0]?.[0] ?? exception.message)
        : 'ورود فایل ممکن نشد.';
  } finally {
    busy.value = false;
  }
}
async function runExport(): Promise<void> {
  try {
    await exportOpportunities();
  } catch {
    error.value = 'دریافت خروجی ممکن نشد.';
  }
}

watch(
  () => route.query,
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
        <div class="eyebrow">مدیریت کسب‌وکار</div>
        <h1>صندوق فرصت‌ها</h1>
      </div>
      <div class="stack-row">
        <router-link to="/provider" class="btn btn--ghost"
          ><q-icon name="inbox" size="18px" />دعوت‌ها</router-link
        >
        <button
          class="btn btn--outline"
          :disabled="!meta?.profiles.length"
          @click="importing = true"
        >
          <q-icon name="upload" size="18px" />ورود از فایل
        </button>
        <button class="btn btn--outline" :disabled="!items?.length" @click="runExport">
          <q-icon name="download" size="18px" />خروجی CSV
        </button>
        <button
          class="btn btn--primary"
          :disabled="!meta?.profiles.length"
          @click="creating = true"
        >
          <q-icon name="add" size="18px" />فرصت جدید
        </button>
      </div>
    </div>

    <CrmNav />

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!items || !meta" class="skeleton" style="height: 320px" />
    <div v-else-if="!meta.profiles.length" class="state">
      <q-icon name="badge" />
      صندوق فرصت برای صاحبان پروفایل کارگزار یا نماینده فعال است.
      <div style="margin-top: 14px">
        <router-link to="/search" class="btn btn--amber">مطالبهٔ پروفایل</router-link>
      </div>
    </div>

    <template v-else>
      <div class="kpi-row">
        <div class="kpi">
          <span>ارزش فرصت‌های باز</span><b>{{ faMoneyShort(meta.open_value) || '—' }}</b>
        </div>
        <div class="kpi">
          <span>فرصت باز</span>
          <b>{{
            faNumber(openStages.reduce((sum, stage) => sum + (meta!.stage_counts[stage] ?? 0), 0))
          }}</b>
        </div>
        <div class="kpi">
          <span>موفق</span><b>{{ faNumber(meta.stage_counts.won ?? 0) }}</b>
        </div>
        <div class="kpi" :class="{ 'kpi--alert': meta.due_reminders > 0 }">
          <span>یادآور امروز</span><b>{{ faNumber(meta.due_reminders) }}</b>
        </div>
      </div>

      <form class="toolbar" @submit.prevent="applyFilters">
        <div class="header-search" style="max-width: 320px">
          <q-icon name="search" size="18px" />
          <input
            v-model="search"
            placeholder="عنوان یا نام مخاطب"
            aria-label="جست‌وجو در فرصت‌ها"
          />
        </div>
        <select
          v-model="source"
          class="select"
          style="width: auto; margin: 0"
          aria-label="منبع"
          @change="applyFilters"
        >
          <option value="">همه منابع</option>
          <option v-for="(label, key) in leadSources" :key="key" :value="key">{{ label }}</option>
        </select>
        <label class="check" style="margin: 0">
          <input v-model="showClosed" type="checkbox" />نمایش موفق و ناموفق
        </label>
      </form>

      <div class="board" :style="{ '--columns': columns.length }">
        <section
          v-for="stage in columns"
          :key="stage"
          class="board__column"
          :aria-label="crmStages[stage]!.label"
        >
          <header>
            <span class="badge" :class="`badge--${crmStages[stage]!.tone}`">{{
              crmStages[stage]!.label
            }}</span>
            <small>{{ faNumber(byStage[stage]?.length ?? 0) }}</small>
          </header>
          <router-link
            v-for="item in byStage[stage]"
            :key="item.id"
            :to="`/crm/${item.id}`"
            class="lead-card"
          >
            <b>{{ item.title }}</b>
            <span v-if="item.client">{{ item.client.name }}</span>
            <span v-else-if="item.contact_name">{{ item.contact_name }}</span>
            <div class="lead-card__meta">
              <span v-if="item.estimated_premium">{{ faMoneyShort(item.estimated_premium) }}</span>
              <span class="chip">{{ leadSources[item.source] }}</span>
            </div>
            <small v-if="item.next_reminder_at" class="lead-card__reminder">
              <q-icon name="alarm" /> {{ faDate(item.next_reminder_at) }}
            </small>
            <small v-if="multipleProfiles" class="muted-text">{{ item.provider.name }}</small>
          </router-link>
          <p v-if="!byStage[stage]?.length" class="board__empty">موردی نیست</p>
        </section>
      </div>
    </template>

    <q-dialog v-model="creating">
      <form class="dialog-card" @submit.prevent="create">
        <h2>فرصت جدید</h2>
        <p>
          مخاطبان شما فقط برای خودتان قابل مشاهده‌اند و با هیچ شرکت یا ارائه‌دهندهٔ دیگری به اشتراک
          گذاشته نمی‌شوند.
        </p>
        <label v-if="multipleProfiles" class="field-label">
          پروفایل
          <select v-model="profile" class="select">
            <option v-for="item in meta?.profiles" :key="item.slug" :value="item.slug">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="field-label"
          >عنوان<input v-model="draft.title" class="input" required minlength="3" maxlength="255"
        /></label>
        <div class="form-row">
          <label class="field-label"
            >نام مخاطب<input v-model="draft.contact_name" class="input" maxlength="255"
          /></label>
          <label class="field-label"
            >تلفن<input v-model="draft.contact_phone" class="input" dir="ltr" inputmode="tel"
          /></label>
          <label class="field-label"
            >رشته بیمه<input v-model="draft.insurance_line" class="input" maxlength="64"
          /></label>
          <label class="field-label">
            حق بیمه تخمینی (ریال)
            <input
              v-model.number="draft.estimated_premium"
              class="input"
              type="number"
              min="0"
              dir="ltr"
            />
          </label>
        </div>
        <label class="field-label"
          >تاریخ پیش‌بینی نتیجه<JalaliDateInput v-model="draft.expected_close_date"
        /></label>
        <div v-if="formError" class="notice notice--error">{{ formError }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="creating = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ثبت فرصت</button>
        </div>
      </form>
    </q-dialog>

    <q-dialog v-model="importing" @hide="importResult = null">
      <form class="dialog-card" @submit.prevent="runImport">
        <h2>ورود فرصت‌ها از CSV</h2>
        <p>
          سطر اول: نام ستون‌ها. ستون <code>title</code> الزامی است؛ ستون‌های اختیاری:
          <code>contact_name</code>، <code>contact_phone</code>، <code>contact_email</code>،
          <code>insurance_line</code>، <code>estimated_premium</code>،
          <code>expected_close_date</code>. فقط مخاطبانی را وارد کنید که اجازهٔ نگهداری اطلاعاتشان
          را دارید.
        </p>
        <label v-if="multipleProfiles" class="field-label">
          پروفایل
          <select v-model="profile" class="select">
            <option v-for="item in meta?.profiles" :key="item.slug" :value="item.slug">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="btn btn--outline file-picker">
          <q-icon name="upload_file" size="18px" />{{ importFile?.name ?? 'انتخاب فایل' }}
          <input type="file" accept=".csv,text/csv" @change="pickFile" />
        </label>
        <div
          v-if="importResult"
          class="notice"
          :class="{ 'notice--info': importResult.errors.length }"
        >
          {{ faNumber(importResult.created) }} فرصت ثبت شد.
          <ul v-if="importResult.errors.length" style="margin: 6px 0 0; padding-inline-start: 18px">
            <li v-for="item in importResult.errors.slice(0, 8)" :key="item.row">
              ردیف {{ faNumber(item.row) }}: {{ item.message }}
            </li>
          </ul>
        </div>
        <div v-if="formError" class="notice notice--error">{{ formError }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="importing = false">بستن</button>
          <button class="btn btn--primary" :disabled="busy || !importFile">ورود</button>
        </div>
      </form>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
