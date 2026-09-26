<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, deleteIncentive, getIncentive, incentiveAction, updateIncentive } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { errorMessage, faDate, faMetric, faNumber, incentiveStatuses } from '../format';
import type { IncentiveDraft, IncentiveProgram } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import InsurerNav from '../components/InsurerNav.vue';
import IncentiveForm from '../components/IncentiveForm.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'جشنوارهٔ فروش | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const router = useRouter();
const requireAuth = useRequireAuth();
const id = Number(route.params.id);
const program = ref<IncentiveProgram | null>(null);
const error = ref('');
const actionError = ref('');
const busy = ref(false);
const editing = ref(false);
const draft = reactive<IncentiveDraft>({
  title: '',
  description: null,
  insurance_lines: [],
  metric: 'premium',
  starts_on: '',
  ends_on: '',
  tiers: [],
});

function startEdit(): void {
  if (!program.value) return;
  const { title, description, insurance_lines, metric, starts_on, ends_on, tiers } = program.value;
  Object.assign(draft, {
    title,
    description,
    insurance_lines: [...insurance_lines],
    metric,
    starts_on,
    ends_on,
    tiers: tiers.map((tier) => ({ ...tier })),
  });
  editing.value = true;
}
async function run(action: () => Promise<unknown>): Promise<void> {
  busy.value = true;
  actionError.value = '';
  try {
    await action();
    program.value = await getIncentive(id);
  } catch (exception) {
    actionError.value = errorMessage(exception);
  } finally {
    busy.value = false;
  }
}
async function remove(): Promise<void> {
  if (!window.confirm('این پیش‌نویس حذف شود؟')) return;
  await deleteIncentive(id);
  await router.push('/insurer/incentives');
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    program.value = await getIncentive(id);
  } catch (exception) {
    error.value =
      exception instanceof ApiError && exception.status === 403 ? 'دسترسی ندارید.' : 'پیدا نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/insurer/incentives">جشنواره‌های فروش</router-link>
      <q-icon name="chevron_left" />
      <span>{{ program?.title ?? 'جشنواره' }}</span>
    </nav>
    <InsurerNav />

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!program" class="skeleton" style="height: 240px" />
    <template v-else>
      <header class="profile-head">
        <span class="tile tile--lg tone-amber"><q-icon name="emoji_events" /></span>
        <div class="profile-head__body">
          <h1>{{ program.title }}</h1>
          <div class="profile-head__meta">
            {{ faDate(program.starts_on) }} تا {{ faDate(program.ends_on) }} ·
            {{ program.metric === 'premium' ? 'مجموع حق بیمه' : 'تعداد بیمه‌نامه' }}
            <template v-if="program.insurance_lines.length">
              · {{ program.insurance_lines.join('، ') }}</template
            >
          </div>
          <div class="profile-head__badges">
            <StatusBadge :status="incentiveStatuses[program.status]" />
          </div>
        </div>
        <div class="profile-head__actions">
          <template v-if="program.status === 'draft'">
            <button class="btn btn--ghost" @click="remove">حذف</button>
            <button class="btn btn--outline" @click="startEdit">ویرایش</button>
            <button
              class="btn btn--primary"
              :disabled="busy"
              @click="run(() => incentiveAction(id, 'publish'))"
            >
              انتشار برای شبکه
            </button>
          </template>
          <button
            v-else-if="program.status === 'published'"
            class="btn btn--outline"
            :disabled="busy"
            @click="run(() => incentiveAction(id, 'close'))"
          >
            پایان جشنواره
          </button>
        </div>
      </header>
      <div v-if="actionError" class="notice notice--error">{{ actionError }}</div>

      <form
        v-if="editing"
        class="card"
        @submit.prevent="
          run(async () => {
            await updateIncentive(id, draft);
            editing = false;
          })
        "
      >
        <IncentiveForm v-model="draft" />
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="editing = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ذخیره</button>
        </div>
      </form>

      <div class="profile-grid">
        <section class="card">
          <h2><q-icon name="leaderboard" />جدول نمایندگان</h2>
          <p v-if="!program.standings?.length" class="muted-text">
            نمایندهٔ دارای وابستگی بررسی‌شده‌ای در شبکه نیست.
          </p>
          <table v-else class="line-table">
            <thead>
              <tr>
                <th>#</th>
                <th>نماینده</th>
                <th>تأییدشده</th>
                <th>در انتظار تأیید</th>
                <th>پله</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in program.standings" :key="row.actor_id">
                <td>{{ faNumber(index + 1) }}</td>
                <td>
                  <router-link :to="`/profiles/${row.slug}`" class="link">{{
                    row.name
                  }}</router-link>
                </td>
                <td>{{ faMetric(program.metric, row.confirmed) }}</td>
                <td>{{ faMetric(program.metric, row.pending) }}</td>
                <td>{{ row.tier?.reward ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <aside>
          <section class="card">
            <h2><q-icon name="flag" />پله‌ها</h2>
            <div v-for="tier in program.tiers" :key="tier.threshold" class="kv">
              <b>{{ faMetric(program.metric, tier.threshold) }}</b
              ><span>{{ tier.reward }}</span>
            </div>
            <p v-if="program.description" class="pre" style="margin-top: 12px">
              {{ program.description }}
            </p>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
