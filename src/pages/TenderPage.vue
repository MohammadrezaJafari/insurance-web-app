<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import {
  ApiError,
  answerQuestion,
  awardBid,
  cancelTender,
  getTender,
  inviteToTender,
  openTenderDocument,
  publishTender,
  scoreBid,
  tenderCandidates,
  uninvite,
  uploadTenderDocument,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useTenderMeta } from '../composables/useTenderMeta';
import {
  actorTypes,
  faDateTime,
  faMoney,
  faMoneyShort,
  faNumber,
  fileSize,
  tenderInvitationStatuses,
  tenderStatuses,
} from '../format';
import type { TenderDetail } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';
import TenderDisclaimer from '../components/TenderDisclaimer.vue';

useMeta({
  title: 'اتاق مناقصه | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

type Tab = 'overview' | 'invitations' | 'documents' | 'questions' | 'bids' | 'decision';
const route = useRoute();
const requireAuth = useRequireAuth();
const { meta, load: loadMeta } = useTenderMeta();
const reference = String(route.params.reference);
const tender = ref<TenderDetail | null>(null);
const tab = ref<Tab>('overview');
const error = ref('');
const actionError = ref('');
const busy = ref(false);

const search = ref('');
const candidates = ref<
  { name: string; slug: string; type: string; province: string | null; insurance_lines: string[] }[]
>([]);
const selected = ref<string[]>([]);
const upload = reactive<{
  file: File | null;
  title: string;
  documentId: number | null;
  note: string;
}>({
  file: null,
  title: '',
  documentId: null,
  note: '',
});
const answers = reactive<Record<number, string>>({});
const scores = reactive<Record<number, Record<string, { score: number; comment: string | null }>>>(
  {},
);
const award = reactive<{ bidId: number | null; minutes: string }>({ bidId: null, minutes: '' });
const cancelReason = ref('');
const cancelling = ref(false);

const tabs = computed<{ key: Tab; label: string; count?: number }[]>(() => [
  { key: 'overview', label: 'خلاصه' },
  { key: 'invitations', label: 'دعوت‌شدگان', count: tender.value?.invitations.length ?? 0 },
  { key: 'documents', label: 'اسناد', count: tender.value?.documents.length ?? 0 },
  {
    key: 'questions',
    label: 'پرسش و پاسخ',
    count: tender.value?.questions.filter((q) => !q.answer).length ?? 0,
  },
  { key: 'bids', label: 'پیشنهادها و ارزیابی' },
  { key: 'decision', label: 'تصمیم' },
]);
const ranked = computed(() =>
  [...(tender.value?.bids ?? [])].sort(
    (a, b) => (b.evaluation?.total ?? -1) - (a.evaluation?.total ?? -1) || a.premium - b.premium,
  ),
);
const criteriaEntries = computed(() => Object.entries(tender.value?.criteria ?? {}));

function fillScoreDrafts(): void {
  for (const bid of tender.value?.bids ?? []) {
    scores[bid.id] = Object.fromEntries(
      criteriaEntries.value.map(([key]) => [
        key,
        { score: bid.my_scores[key]?.score ?? 5, comment: bid.my_scores[key]?.comment ?? null },
      ]),
    );
  }
}
async function run(action: () => Promise<TenderDetail>, after?: () => void): Promise<void> {
  busy.value = true;
  actionError.value = '';
  try {
    tender.value = await action();
    fillScoreDrafts();
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
async function findCandidates(): Promise<void> {
  try {
    candidates.value = await tenderCandidates(reference, search.value);
  } catch {
    candidates.value = [];
  }
}
function pickFile(event: Event): void {
  upload.file = (event.target as HTMLInputElement).files?.[0] ?? null;
}
function sendUpload(): void {
  if (!upload.file) return;
  const options = upload.documentId
    ? { documentId: upload.documentId, changeNote: upload.note }
    : { title: upload.title, changeNote: upload.note };
  void run(
    () => uploadTenderDocument(reference, upload.file!, options),
    () => Object.assign(upload, { file: null, title: '', documentId: null, note: '' }),
  );
}
async function openDocument(versionId: number): Promise<void> {
  try {
    await openTenderDocument(versionId);
  } catch (exception) {
    actionError.value =
      exception instanceof ApiError ? exception.message : 'باز کردن سند ممکن نشد.';
  }
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  await loadMeta();
  try {
    tender.value = await getTender(reference);
    fillScoreDrafts();
    if (tender.value.can.manage && tender.value.status === 'draft') void findCandidates();
    if (tender.value.status === 'evaluation') tab.value = 'bids';
  } catch (exception) {
    error.value =
      exception instanceof ApiError && exception.status === 403
        ? 'به این مناقصه دسترسی ندارید.'
        : 'مناقصه پیدا نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/tenders">مناقصه‌ها</router-link>
      <q-icon name="chevron_left" />
      <span>اتاق مناقصه</span>
    </nav>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!tender" class="skeleton" style="height: 240px" />

    <template v-else>
      <header class="profile-head">
        <span class="tile tile--lg tone-violet"><q-icon name="gavel" /></span>
        <div class="profile-head__body">
          <h1>{{ tender.title }}</h1>
          <div class="profile-head__meta">
            {{ tender.organization.name }} · {{ tender.insurance_line }}
            <template v-if="tender.coverage_amount">
              · تعهد {{ faMoneyShort(tender.coverage_amount) }}</template
            >
          </div>
          <div class="profile-head__badges">
            <StatusBadge :status="tenderStatuses[tender.status]" />
            <span v-if="tender.role" class="badge badge--neutral"
              >نقش شما: {{ meta?.roles[tender.role] }}</span
            >
            <span v-if="tender.submission_deadline_at" class="badge badge--neutral">
              <q-icon name="lock_clock" size="14px" />مهلت پیشنهاد
              {{ faDateTime(tender.submission_deadline_at) }}
            </span>
          </div>
        </div>
        <div class="profile-head__actions">
          <template v-if="tender.can.manage && tender.status === 'draft'">
            <button
              class="btn btn--primary"
              :disabled="busy"
              @click="run(() => publishTender(reference))"
            >
              <q-icon name="campaign" size="18px" />انتشار و ارسال دعوت
            </button>
            <router-link :to="`/tenders/${reference}/edit`" class="btn btn--outline"
              >ویرایش مشخصات</router-link
            >
          </template>
          <router-link
            v-if="['evaluation', 'awarded'].includes(tender.status)"
            :to="`/tenders/${reference}/report`"
            class="btn btn--outline"
          >
            <q-icon name="print" size="18px" />گزارش
          </router-link>
          <button
            v-if="tender.can.manage && ['draft', 'open', 'evaluation'].includes(tender.status)"
            class="btn btn--ghost"
            @click="cancelling = !cancelling"
          >
            لغو مناقصه
          </button>
        </div>
      </header>
      <form
        v-if="cancelling"
        class="card cancel-box"
        @submit.prevent="
          run(
            () => cancelTender(reference, cancelReason),
            () => (cancelling = false),
          )
        "
      >
        <label class="field-label">
          علت لغو (به شرکت‌کنندگان اعلام می‌شود)
          <input v-model="cancelReason" class="input" required minlength="10" maxlength="255" />
        </label>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="cancelling = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">تأیید لغو</button>
        </div>
      </form>
      <TenderDisclaimer />
      <div v-if="actionError" class="notice notice--error">{{ actionError }}</div>

      <div class="type-strip tender-tabs" role="tablist">
        <button
          v-for="item in tabs"
          :key="item.key"
          role="tab"
          :aria-selected="tab === item.key"
          :class="{ active: tab === item.key }"
          @click="tab = item.key"
        >
          {{ item.label }}<small v-if="item.count">{{ faNumber(item.count) }}</small>
        </button>
      </div>

      <!-- Overview -->
      <div v-if="tab === 'overview'" class="profile-grid">
        <section class="card">
          <h2><q-icon name="description" />شرح نیاز</h2>
          <p class="pre">{{ tender.description }}</p>
          <p v-if="tender.cancel_reason" class="notice notice--error">
            لغو شد: {{ tender.cancel_reason }}
          </p>
        </section>
        <aside>
          <section class="card">
            <h2><q-icon name="event" />زمان‌بندی</h2>
            <div class="kv">
              <b>انتشار</b><span>{{ faDateTime(tender.published_at) }}</span>
            </div>
            <div class="kv">
              <b>پایان پرسش</b><span>{{ faDateTime(tender.questions_deadline_at) }}</span>
            </div>
            <div class="kv">
              <b>پایان پیشنهاد</b><span>{{ faDateTime(tender.submission_deadline_at) }}</span>
            </div>
          </section>
          <section class="card">
            <h2><q-icon name="balance" />معیارها</h2>
            <div v-for="[key, criterion] in criteriaEntries" :key="key" class="kv">
              <b>{{ criterion.label }}</b
              ><span>{{ faNumber(criterion.weight) }}٪</span>
            </div>
          </section>
        </aside>
      </div>

      <!-- Invitations -->
      <div v-else-if="tab === 'invitations'" class="profile-grid">
        <section class="card">
          <h2><q-icon name="groups" />ارائه‌دهندگان دعوت‌شده</h2>
          <p v-if="!tender.invitations.length" class="muted-text">هنوز کسی دعوت نشده است.</p>
          <div
            v-for="invitation in tender.invitations"
            :key="invitation.id"
            class="provider-item"
            style="display: block"
          >
            <div class="review-item" style="border: 0; padding: 0">
              <div>
                <router-link :to="`/profiles/${invitation.provider.slug}`" class="link">{{
                  invitation.provider.name
                }}</router-link>
                <small
                  >{{ actorTypes[invitation.provider.type].label
                  }}<template v-if="invitation.provider.province">
                    · {{ invitation.provider.province }}</template
                  ></small
                >
              </div>
              <StatusBadge :status="tenderInvitationStatuses[invitation.status]" />
              <span v-if="invitation.has_bid" class="badge badge--verified">پیشنهاد داد</span>
              <button
                v-if="tender.can.manage && tender.status === 'draft'"
                class="btn btn--ghost"
                :aria-label="`حذف ${invitation.provider.name}`"
                @click="run(() => uninvite(reference, invitation.id))"
              >
                <q-icon name="close" />
              </button>
            </div>
            <div
              v-if="invitation.conflict_declared"
              class="notice notice--error"
              style="margin-top: 6px"
            >
              <b>تعارض منافع اعلام‌شده:</b> {{ invitation.conflict_note }}
            </div>
            <p v-if="invitation.decline_reason" class="muted-text">
              علت انصراف: {{ invitation.decline_reason }}
            </p>
          </div>
          <p v-if="!tender.bids_unsealed && tender.status === 'open'" class="card__note">
            <q-icon name="lock" /> تا پایان مهلت، اینکه چه کسی پیشنهاد داده است نمایش داده نمی‌شود.
          </p>
        </section>
        <aside v-if="tender.can.manage && ['draft', 'open'].includes(tender.status)">
          <section class="card">
            <h2><q-icon name="person_add" />دعوت ارائه‌دهنده</h2>
            <p class="muted-text">
              فقط پروفایل‌های مطالبه‌شده و دارای نشان بررسی؛ حداکثر
              {{ faNumber(meta?.max_invitations ?? 10) }} دعوت. اعضای سازمان شما قابل دعوت نیستند.
            </p>
            <form class="thread__form" @submit.prevent="findCandidates">
              <input
                v-model="search"
                class="input"
                placeholder="نام ارائه‌دهنده"
                aria-label="جست‌وجوی ارائه‌دهنده"
              />
              <button class="btn btn--outline" aria-label="جست‌وجو">
                <q-icon name="search" />
              </button>
            </form>
            <label v-for="candidate in candidates" :key="candidate.slug" class="check candidate">
              <input v-model="selected" type="checkbox" :value="candidate.slug" />
              <span>
                {{ candidate.name }}
                <small>
                  {{ actorTypes[candidate.type as keyof typeof actorTypes]?.label }}
                  <template v-if="candidate.insurance_lines.includes(tender.insurance_line)">
                    · ارائهٔ {{ tender.insurance_line }}</template
                  >
                </small>
              </span>
            </label>
            <button
              class="btn btn--primary btn--block"
              :disabled="busy || !selected.length"
              @click="
                run(
                  () => inviteToTender(reference, selected),
                  () => {
                    selected = [];
                    void findCandidates();
                  },
                )
              "
            >
              دعوت {{ selected.length ? faNumber(selected.length) : '' }} ارائه‌دهنده
            </button>
          </section>
        </aside>
      </div>

      <!-- Documents -->
      <div v-else-if="tab === 'documents'" class="profile-grid">
        <section class="card">
          <h2><q-icon name="folder" />اسناد مناقصه</h2>
          <p v-if="!tender.documents.length" class="muted-text">سندی بارگذاری نشده است.</p>
          <div v-for="document in tender.documents" :key="document.id" class="doc">
            <b>{{ document.title }}</b>
            <ol class="timeline">
              <li v-for="version in document.versions" :key="version.id">
                <button class="link-button" @click="openDocument(version.id)">
                  نسخهٔ {{ faNumber(version.version) }} · {{ version.name }}
                </button>
                <small>
                  {{ faDateTime(version.uploaded_at) }} · {{ fileSize(version.size) }}
                  <template v-if="version.change_note"> · {{ version.change_note }}</template>
                </small>
              </li>
            </ol>
          </div>
        </section>
        <aside v-if="tender.can.manage && ['draft', 'open'].includes(tender.status)">
          <form class="card" @submit.prevent="sendUpload">
            <h2><q-icon name="upload_file" />بارگذاری سند یا نسخهٔ جدید</h2>
            <label class="field-label">
              سند
              <select v-model="upload.documentId" class="select">
                <option :value="null">سند جدید</option>
                <option
                  v-for="document in tender.documents"
                  :key="document.id"
                  :value="document.id"
                >
                  نسخهٔ جدید «{{ document.title }}»
                </option>
              </select>
            </label>
            <label v-if="!upload.documentId" class="field-label"
              >عنوان سند<input v-model="upload.title" class="input" maxlength="255"
            /></label>
            <label class="field-label"
              >توضیح تغییر<input v-model="upload.note" class="input" maxlength="255"
            /></label>
            <label class="btn btn--outline file-picker btn--block">
              <q-icon name="attach_file" size="18px" />{{ upload.file?.name ?? 'انتخاب فایل' }}
              <input
                type="file"
                :accept="meta?.document.mimes.map((mime) => `.${mime}`).join(',')"
                @change="pickFile"
              />
            </label>
            <p v-if="tender.status === 'open'" class="card__note">
              انتشار نسخهٔ جدید به همهٔ شرکت‌کنندگان اعلام می‌شود.
            </p>
            <button
              class="btn btn--primary btn--block"
              style="margin-top: 10px"
              :disabled="busy || !upload.file"
            >
              بارگذاری
            </button>
          </form>
        </aside>
      </div>

      <!-- Questions -->
      <section v-else-if="tab === 'questions'" class="card" style="margin-top: 16px">
        <h2><q-icon name="forum" />پرسش و پاسخ</h2>
        <p class="muted-text">
          پاسخ هر پرسش برای همهٔ شرکت‌کنندگان منتشر می‌شود و نام پرسش‌کننده به آن‌ها نمایش داده
          نمی‌شود.
        </p>
        <p v-if="!tender.questions.length" class="muted-text">پرسشی ثبت نشده است.</p>
        <div v-for="question in tender.questions" :key="question.id" class="qa">
          <div class="bubble">
            <small>{{ question.asked_by }} · {{ faDateTime(question.asked_at) }}</small
            >{{ question.question }}
          </div>
          <div v-if="question.answer" class="bubble bubble--mine">
            <small>پاسخ منتشرشده · {{ faDateTime(question.answered_at) }}</small
            >{{ question.answer }}
          </div>
          <form
            v-else-if="tender.can.manage && tender.status === 'open'"
            class="thread__form"
            @submit.prevent="
              run(() => answerQuestion(reference, question.id, answers[question.id] ?? ''))
            "
          >
            <input
              v-model="answers[question.id]"
              class="input"
              required
              placeholder="پاسخ برای همهٔ شرکت‌کنندگان"
              aria-label="پاسخ"
            />
            <button class="btn btn--primary" :disabled="busy">انتشار پاسخ</button>
          </form>
        </div>
      </section>

      <!-- Bids & evaluation -->
      <section v-else-if="tab === 'bids'" class="card" style="margin-top: 16px">
        <h2><q-icon name="compare_arrows" />پیشنهادها و ارزیابی</h2>
        <div v-if="!tender.bids_unsealed" class="state">
          <q-icon name="lock" />
          پیشنهادها تا پایان مهلت ({{ faDateTime(tender.submission_deadline_at) }}) مهر و موم‌اند.
        </div>
        <p v-else-if="!ranked.length" class="muted-text">پیشنهادی دریافت نشد.</p>
        <template v-else>
          <div class="compare-scroll">
            <table class="compare">
              <thead>
                <tr>
                  <th scope="row">ارائه‌دهنده</th>
                  <th
                    v-for="bid in ranked"
                    :key="bid.id"
                    :class="{ chosen: bid.status === 'awarded' }"
                    scope="col"
                  >
                    <router-link :to="`/profiles/${bid.provider.slug}`" class="link">{{
                      bid.provider.name
                    }}</router-link>
                    <small
                      >امتیاز:
                      {{
                        bid.evaluation?.total !== null && bid.evaluation?.total !== undefined
                          ? faNumber(bid.evaluation.total)
                          : '—'
                      }}
                      از ۱۰۰ · {{ faNumber(bid.evaluation?.evaluators ?? 0) }} ارزیاب</small
                    >
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">شرکت بیمه</th>
                  <td v-for="bid in ranked" :key="bid.id">{{ bid.insurer_name || '—' }}</td>
                </tr>
                <tr>
                  <th scope="row">حق بیمه</th>
                  <td v-for="bid in ranked" :key="bid.id">
                    <b>{{ faMoney(bid.premium) }}</b>
                  </td>
                </tr>
                <tr>
                  <th scope="row">سقف تعهد</th>
                  <td v-for="bid in ranked" :key="bid.id">{{ faMoney(bid.coverage_amount) }}</td>
                </tr>
                <tr>
                  <th scope="row">فرانشیز</th>
                  <td v-for="bid in ranked" :key="bid.id">{{ bid.deductible || '—' }}</td>
                </tr>
                <tr>
                  <th scope="row">پوشش‌ها</th>
                  <td v-for="bid in ranked" :key="bid.id" class="pre">{{ bid.coverages }}</td>
                </tr>
                <tr>
                  <th scope="row">استثناها</th>
                  <td v-for="bid in ranked" :key="bid.id" class="pre">
                    {{ bid.exclusions || '—' }}
                  </td>
                </tr>
                <tr>
                  <th scope="row">خدمات</th>
                  <td v-for="bid in ranked" :key="bid.id" class="pre">{{ bid.services || '—' }}</td>
                </tr>
                <tr>
                  <th scope="row">سابقه</th>
                  <td v-for="bid in ranked" :key="bid.id" class="pre">
                    {{ bid.experience || '—' }}
                  </td>
                </tr>
                <tr v-for="[key, criterion] in criteriaEntries" :key="key">
                  <th scope="row">
                    {{ criterion.label }}
                    <small class="muted-text">({{ faNumber(criterion.weight) }}٪)</small>
                  </th>
                  <td v-for="bid in ranked" :key="bid.id">
                    <span class="muted-text"
                      >میانگین:
                      {{
                        bid.evaluation?.averages[key] !== null &&
                        bid.evaluation?.averages[key] !== undefined
                          ? faNumber(bid.evaluation.averages[key]!)
                          : '—'
                      }}</span
                    >
                    <input
                      v-if="tender.can.evaluate && tender.status === 'evaluation' && scores[bid.id]"
                      v-model.number="scores[bid.id]![key]!.score"
                      class="input score-input"
                      type="range"
                      min="0"
                      max="10"
                      :aria-label="`امتیاز ${criterion.label} برای ${bid.provider.name}`"
                    />
                    <small
                      v-if="tender.can.evaluate && tender.status === 'evaluation' && scores[bid.id]"
                      >امتیاز شما: {{ faNumber(scores[bid.id]![key]!.score) }}</small
                    >
                  </td>
                </tr>
                <tr v-if="tender.can.evaluate && tender.status === 'evaluation'">
                  <th scope="row"></th>
                  <td v-for="bid in ranked" :key="bid.id">
                    <button
                      class="btn btn--outline btn--block"
                      :disabled="busy"
                      @click="run(() => scoreBid(reference, bid.id, scores[bid.id]!))"
                    >
                      ثبت امتیاز من
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="card__note">
            امتیاز نهایی = میانگین امتیاز ارزیابان در هر معیار (۰ تا ۱۰) × وزن معیار. امتیاز فقط پس
            از ثبت همهٔ معیارها محاسبه می‌شود.
          </p>
        </template>
      </section>

      <!-- Decision -->
      <section v-else class="card" style="margin-top: 16px">
        <h2><q-icon name="verified" />تصمیم و صورت‌جلسه</h2>
        <template v-if="tender.status === 'awarded'">
          <div class="notice">
            برنده:
            <b>{{
              tender.bids?.find((bid) => bid.id === tender!.awarded_bid_id)?.provider.name
            }}</b>
            · {{ faDateTime(tender.decided_at) }}
          </div>
          <p class="pre" style="margin-top: 12px">{{ tender.decision_minutes }}</p>
        </template>
        <form
          v-else-if="tender.can.manage && tender.status === 'evaluation' && ranked.length"
          @submit.prevent="run(() => awardBid(reference, award.bidId!, award.minutes))"
        >
          <label class="field-label">
            پیشنهاد منتخب
            <select v-model="award.bidId" class="select" required>
              <option :value="null" disabled>انتخاب کنید</option>
              <option v-for="bid in ranked" :key="bid.id" :value="bid.id">
                {{ bid.provider.name }} — {{ faMoneyShort(bid.premium)
                }}<template
                  v-if="bid.evaluation?.total !== null && bid.evaluation?.total !== undefined"
                >
                  — امتیاز {{ faNumber(bid.evaluation.total) }}</template
                >
              </option>
            </select>
          </label>
          <label class="field-label">
            صورت‌جلسهٔ تصمیم (حاضران، دلایل انتخاب، ملاحظات)
            <textarea
              v-model="award.minutes"
              class="textarea"
              style="min-height: 180px"
              required
              minlength="30"
            />
          </label>
          <p class="card__note">
            پس از ثبت، نتیجه به همهٔ شرکت‌کنندگان اعلام و اطلاعات تماس سازمان فقط به برنده نمایش
            داده می‌شود.
          </p>
          <button class="btn btn--primary" :disabled="busy || !award.bidId">ثبت تصمیم</button>
        </form>
        <p v-else class="muted-text">
          تصمیم پس از پایان مهلت و ارزیابی پیشنهادها توسط مدیر مناقصه ثبت می‌شود.
        </p>
      </section>
    </template>
  </main>
  <SiteFooter />
</template>
