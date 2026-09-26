<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, createIncentive, incentivePrograms } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { errorMessage, faDate, faMetric, incentiveStatuses } from '../format';
import type { IncentiveDraft, IncentiveProgram, ProfileRef } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import InsurerNav from '../components/InsurerNav.vue';
import IncentiveForm from '../components/IncentiveForm.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'جشنواره‌های فروش | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const router = useRouter();
const requireAuth = useRequireAuth();
const programs = ref<IncentiveProgram[] | null>(null);
const insurer = ref<ProfileRef | null>(null);
const error = ref('');
const creating = ref(false);
const busy = ref(false);
const formError = ref('');
const draft = reactive<IncentiveDraft>({
  title: '',
  description: null,
  insurance_lines: [],
  metric: 'premium',
  starts_on: null as unknown as string,
  ends_on: null as unknown as string,
  tiers: [{ threshold: 0, reward: '' }],
});

async function load(): Promise<void> {
  try {
    const result = await incentivePrograms(route.query.insurer as string | undefined);
    programs.value = result.data;
    insurer.value = result.insurer;
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'دریافت جشنواره‌ها ممکن نشد.';
  }
}
async function create(): Promise<void> {
  if (!insurer.value) return;
  busy.value = true;
  formError.value = '';
  try {
    const program = await createIncentive(insurer.value.slug, draft);
    await router.push(`/insurer/incentives/${program.id}`);
  } catch (exception) {
    formError.value = errorMessage(exception, 'ثبت ممکن نشد.');
  } finally {
    busy.value = false;
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
        <h1>جشنواره‌های فروش{{ insurer ? ` · ${insurer.name}` : '' }}</h1>
      </div>
      <button class="btn btn--primary" :disabled="!insurer" @click="creating = true">
        <q-icon name="add" size="18px" />جشنوارهٔ جدید
      </button>
    </div>
    <InsurerNav />
    <p class="muted-text" style="margin-top: -6px">
      جشنواره فقط برای نمایندگان با وابستگی بررسی‌شده به این شرکت نمایش داده می‌شود و پیشرفت هر
      نماینده بر اساس بیمه‌نامه‌های تأییدشدهٔ شرکت محاسبه می‌شود. پیش از انتشار، سازگاری طرح با
      آیین‌نامه‌های بیمهٔ مرکزی را بررسی کنید.
    </p>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!programs" class="skeleton" style="height: 240px" />
    <div v-else-if="!programs.length" class="state">
      <q-icon name="emoji_events" />هنوز جشنواره‌ای تعریف نشده است.
    </div>
    <div v-else class="card-grid">
      <router-link
        v-for="program in programs"
        :key="program.id"
        :to="`/insurer/incentives/${program.id}`"
        class="card lead-card"
      >
        <b>{{ program.title }}</b>
        <span>{{ faDate(program.starts_on) }} تا {{ faDate(program.ends_on) }}</span>
        <div class="lead-card__meta">
          <StatusBadge :status="incentiveStatuses[program.status]" />
          <span class="chip">
            بالاترین پله: {{ faMetric(program.metric, program.tiers.at(-1)?.threshold ?? 0) }}
          </span>
        </div>
      </router-link>
    </div>

    <q-dialog v-model="creating">
      <form class="dialog-card" style="max-width: 640px" @submit.prevent="create">
        <h2>جشنوارهٔ جدید</h2>
        <p>ابتدا به‌صورت پیش‌نویس ذخیره می‌شود و پس از بازبینی منتشر می‌کنید.</p>
        <IncentiveForm v-model="draft" />
        <div v-if="formError" class="notice notice--error">{{ formError }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="creating = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ذخیرهٔ پیش‌نویس</button>
        </div>
      </form>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
