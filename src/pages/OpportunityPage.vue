<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import {
  ApiError,
  addReminder,
  changeStage,
  completeReminder,
  getOpportunity,
  logActivity,
  updateOpportunity,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { activityTypes, crmStages, faDate, faDateTime, faMoney, leadSources } from '../format';
import { localIsoDate } from '../jalali';
import type { Opportunity, OpportunityDraft, Stage } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({ title: 'فرصت | اینشورهاب', meta: { robots: { name: 'robots', content: 'noindex' } } });

const route = useRoute();
const requireAuth = useRequireAuth();
const id = Number(route.params.id);
const item = ref<Opportunity | null>(null);
const lostReasons = ref<string[]>([]);
const error = ref('');
const actionError = ref('');
const busy = ref(false);
const editing = ref(false);
const pendingStage = ref<Stage | null>(null);
const lostReason = ref('');
const activity = reactive({ type: 'call', body: '' });
const reminder = reactive<{ date: string | null; time: string; body: string }>({
  date: null,
  time: '10:00',
  body: '',
});
const draft = reactive<OpportunityDraft>({
  title: '',
  insurance_line: null,
  contact_name: null,
  contact_phone: null,
  contact_email: null,
  estimated_premium: null,
  expected_close_date: null,
});

const platform = computed(() => item.value?.source === 'platform');
const stageFlow: Stage[] = ['new', 'contacted', 'quoting', 'negotiation', 'won', 'lost'];
const openReminders = computed(
  () => item.value?.reminders?.filter((entry) => !entry.completed_at) ?? [],
);

async function run(action: () => Promise<Opportunity>, after?: () => void): Promise<void> {
  busy.value = true;
  actionError.value = '';
  try {
    item.value = await action();
    after?.();
  } catch (exception) {
    actionError.value =
      exception instanceof ApiError
        ? (Object.values(exception.errors)[0]?.[0] ?? exception.message)
        : 'انجام نشد.';
  } finally {
    busy.value = false;
  }
}
function startEdit(): void {
  if (!item.value) return;
  Object.assign(draft, {
    title: item.value.title,
    insurance_line: item.value.insurance_line,
    contact_name: item.value.contact_name,
    contact_phone: item.value.contact_phone,
    contact_email: item.value.contact_email,
    estimated_premium: item.value.estimated_premium,
    expected_close_date: item.value.expected_close_date,
  });
  editing.value = true;
}
function pickStage(stage: Stage): void {
  if (stage === item.value?.stage) return;
  if (stage === 'lost') {
    pendingStage.value = 'lost';
    return;
  }
  void run(() => changeStage(id, stage, null));
}
function saveReminder(): void {
  if (!reminder.date) return;
  const dueAt = new Date(`${reminder.date}T${reminder.time || '09:00'}`).toISOString();
  void run(
    () => addReminder(id, dueAt, reminder.body),
    () => Object.assign(reminder, { date: null, body: '' }),
  );
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    const result = await getOpportunity(id);
    item.value = result.data;
    lostReasons.value = result.meta.lost_reasons;
  } catch (exception) {
    error.value =
      exception instanceof ApiError && exception.status === 403
        ? 'این فرصت متعلق به شما نیست.'
        : 'فرصت پیدا نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/crm">صندوق فرصت‌ها</router-link>
      <q-icon name="chevron_left" />
      <span>فرصت</span>
    </nav>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!item" class="skeleton" style="height: 240px" />

    <template v-else>
      <header class="profile-head">
        <span class="tile tile--lg tone-violet"><q-icon name="work_outline" /></span>
        <div class="profile-head__body">
          <h1>{{ item.title }}</h1>
          <div class="profile-head__meta">
            {{ item.provider.name
            }}<template v-if="item.insurance_line"> · {{ item.insurance_line }}</template> · ثبت
            {{ faDate(item.created_at) }}
          </div>
          <div class="profile-head__badges">
            <StatusBadge :status="crmStages[item.stage]" />
            <span class="badge badge--neutral">{{ leadSources[item.source] }}</span>
            <span v-if="item.lost_reason" class="badge badge--danger">{{ item.lost_reason }}</span>
          </div>
        </div>
        <div class="profile-head__actions">
          <router-link
            v-if="item.invitation_id"
            :to="`/provider/invitations/${item.invitation_id}`"
            class="btn btn--outline"
          >
            مشاهده دعوت
          </router-link>
          <button v-if="!platform && !editing" class="btn btn--outline" @click="startEdit">
            ویرایش اطلاعات
          </button>
        </div>
      </header>

      <section class="card stage-bar" aria-label="مرحله">
        <template v-if="platform">
          <p class="muted-text" style="margin: 0">
            <q-icon name="lock" /> مرحلهٔ فرصت‌های اینشورهاب با روند درخواست به‌روز می‌شود و اطلاعات
            تماس درخواست‌کننده فقط پس از انتخاب پیشنهاد شما افزوده می‌شود.
          </p>
        </template>
        <div v-else class="stage-steps" role="group">
          <button
            v-for="stage in stageFlow"
            :key="stage"
            :class="{ active: item.stage === stage, [`stage-steps--${stage}`]: true }"
            :aria-pressed="item.stage === stage"
            :disabled="busy"
            @click="pickStage(stage)"
          >
            {{ crmStages[stage]!.label }}
          </button>
        </div>
        <form
          v-if="pendingStage === 'lost'"
          class="stack-row"
          style="margin-top: 12px"
          @submit.prevent="
            run(
              () => changeStage(id, 'lost', lostReason),
              () => (pendingStage = null),
            )
          "
        >
          <select
            v-model="lostReason"
            class="select"
            style="width: auto; margin: 0"
            required
            aria-label="علت"
          >
            <option value="" disabled>علت ناموفق بودن</option>
            <option v-for="reason in lostReasons" :key="reason">{{ reason }}</option>
          </select>
          <button class="btn btn--primary" :disabled="busy">ثبت</button>
          <button type="button" class="btn btn--ghost" @click="pendingStage = null">انصراف</button>
        </form>
      </section>
      <div v-if="actionError" class="notice notice--error">{{ actionError }}</div>

      <div class="profile-grid">
        <div>
          <form
            class="card"
            @submit.prevent="
              run(
                () => logActivity(id, activity.type, activity.body),
                () => (activity.body = ''),
              )
            "
          >
            <h2><q-icon name="add_comment" />ثبت فعالیت</h2>
            <div class="segmented segmented--4" role="radiogroup" aria-label="نوع فعالیت">
              <button
                v-for="type in ['call', 'meeting', 'email', 'note']"
                :key="type"
                type="button"
                role="radio"
                :aria-checked="activity.type === type"
                :class="{ active: activity.type === type }"
                @click="activity.type = type"
              >
                <q-icon :name="activityTypes[type]!.icon" size="16px" />
                {{ activityTypes[type]!.label }}
              </button>
            </div>
            <textarea
              v-model="activity.body"
              class="textarea"
              style="min-height: 80px"
              maxlength="3000"
              required
              placeholder="خلاصهٔ گفت‌وگو یا یادداشت…"
              aria-label="شرح فعالیت"
            />
            <div class="dialog-actions">
              <button class="btn btn--primary" :disabled="busy || !activity.body.trim()">
                ثبت
              </button>
            </div>
          </form>

          <section class="card">
            <h2><q-icon name="history" />تاریخچه</h2>
            <ol class="activity-log">
              <li
                v-for="entry in item.activities"
                :key="entry.id"
                :class="`activity-log--${entry.type}`"
              >
                <span
                  class="tile tile--sm"
                  :class="
                    entry.type === 'system' || entry.type === 'stage' ? 'tone-blue' : 'tone-teal'
                  "
                >
                  <q-icon :name="activityTypes[entry.type]?.icon ?? 'bolt'" />
                </span>
                <div>
                  <b>{{ activityTypes[entry.type]?.label }}</b>
                  <small
                    >{{ faDateTime(entry.occurred_at)
                    }}<template v-if="entry.author"> · {{ entry.author }}</template></small
                  >
                  <p class="pre">{{ entry.body }}</p>
                </div>
              </li>
            </ol>
          </section>
        </div>

        <aside>
          <form
            v-if="editing"
            class="card"
            @submit.prevent="
              run(
                () => updateOpportunity(id, draft),
                () => (editing = false),
              )
            "
          >
            <h2><q-icon name="edit" />ویرایش اطلاعات</h2>
            <label class="field-label"
              >عنوان<input v-model="draft.title" class="input" required minlength="3"
            /></label>
            <label class="field-label"
              >نام مخاطب<input v-model="draft.contact_name" class="input"
            /></label>
            <label class="field-label"
              >تلفن<input v-model="draft.contact_phone" class="input" dir="ltr"
            /></label>
            <label class="field-label"
              >ایمیل<input v-model="draft.contact_email" class="input" type="email" dir="ltr"
            /></label>
            <label class="field-label"
              >رشته بیمه<input v-model="draft.insurance_line" class="input"
            /></label>
            <label class="field-label">
              حق بیمه تخمینی (ریال)<input
                v-model.number="draft.estimated_premium"
                class="input"
                type="number"
                min="0"
                dir="ltr"
              />
            </label>
            <label class="field-label"
              >پیش‌بینی نتیجه<JalaliDateInput v-model="draft.expected_close_date"
            /></label>
            <div class="dialog-actions">
              <button type="button" class="btn btn--ghost" @click="editing = false">انصراف</button>
              <button class="btn btn--primary" :disabled="busy">ذخیره</button>
            </div>
          </form>
          <section v-else class="card">
            <h2><q-icon name="contact_page" />مخاطب و ارزش</h2>
            <div class="kv">
              <b>مخاطب</b
              ><span>{{ item.contact_name || (platform ? 'پس از انتخاب پیشنهاد' : '—') }}</span>
            </div>
            <div v-if="item.contact_phone" class="kv">
              <b>تلفن</b
              ><a :href="`tel:${item.contact_phone}`" class="link" dir="ltr">{{
                item.contact_phone
              }}</a>
            </div>
            <div v-if="item.contact_email" class="kv">
              <b>ایمیل</b
              ><a :href="`mailto:${item.contact_email}`" class="link" dir="ltr">{{
                item.contact_email
              }}</a>
            </div>
            <div class="kv">
              <b>حق بیمه تخمینی</b><span>{{ faMoney(item.estimated_premium) }}</span>
            </div>
            <div class="kv">
              <b>پیش‌بینی نتیجه</b><span>{{ faDate(item.expected_close_date) }}</span>
            </div>
          </section>

          <section class="card">
            <h2><q-icon name="alarm" />یادآورها</h2>
            <div v-for="entry in openReminders" :key="entry.id" class="review-item">
              <div>
                {{ entry.body }}
                <small :class="{ overdue: new Date(entry.due_at) < new Date() }">{{
                  faDateTime(entry.due_at)
                }}</small>
              </div>
              <button
                class="btn btn--ghost"
                :disabled="busy"
                aria-label="انجام شد"
                @click="run(() => completeReminder(entry.id))"
              >
                <q-icon name="task_alt" />
              </button>
            </div>
            <p v-if="!openReminders.length" class="muted-text">یادآور فعالی ندارید.</p>
            <form class="reminder-form" @submit.prevent="saveReminder">
              <input
                v-model="reminder.body"
                class="input"
                maxlength="255"
                required
                placeholder="مثلاً: تماس برای پیش‌فاکتور"
                aria-label="متن یادآور"
              />
              <div class="form-row">
                <JalaliDateInput
                  v-model="reminder.date"
                  :min="localIsoDate()"
                  required
                  label="تاریخ یادآور"
                />
                <input
                  v-model="reminder.time"
                  class="input"
                  type="time"
                  dir="ltr"
                  required
                  aria-label="ساعت یادآور"
                />
              </div>
              <button class="btn btn--outline btn--block" :disabled="busy || !reminder.date">
                افزودن یادآور
              </button>
            </form>
            <p class="card__note">یادآور در زمان مقرر در اعلان‌ها و ایمیل شما نمایش داده می‌شود.</p>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
