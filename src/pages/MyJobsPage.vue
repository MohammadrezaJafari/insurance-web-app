<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import {
  decideApplicant,
  inviteTalent,
  jobApplicants,
  myJobs,
  saveJob,
  talent,
  withdrawJob,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useDirectoryStore } from '../stores/directory';
import {
  applicationStatuses,
  employmentTypes,
  errorMessage,
  faDate,
  faNumber,
  jobRoles,
  moderationStatuses,
} from '../format';
import { localIsoDate } from '../jalali';
import type { Applicant, JobDraft, JobMeta, JobPosting, TalentResume } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'آگهی‌های استخدام من | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const directory = useDirectoryStore();
const jobs = ref<JobPosting[] | null>(null);
const meta = ref<JobMeta | null>(null);
const profile = ref('');
const open = ref(false);
const editingId = ref<number | null>(null);
const applicantsOf = ref<JobPosting | null>(null);
const applicants = ref<Applicant[]>([]);
const people = ref<TalentResume[] | null>(null);
const talentRole = ref('');
const inviteJob = ref<number | null>(null);
const busy = ref(false);
const error = ref('');
const notice = ref('');
const draft = reactive<JobDraft>(blank());

function blank(): JobDraft {
  return {
    title: '',
    role: 'sales',
    employment_type: 'full_time',
    province: null,
    city: null,
    remote: false,
    insurance_lines: [],
    salary_text: null,
    expires_on: '',
    description: '',
    requirements: null,
  };
}
async function load(): Promise<void> {
  const result = await myJobs();
  jobs.value = result.data;
  meta.value = result.meta;
  profile.value ||= result.meta.profiles[0]?.slug ?? '';
  inviteJob.value ||= result.data.find((job) => job.status === 'published')?.id ?? null;
}
function edit(job: JobPosting | null): void {
  editingId.value = job?.id ?? null;
  Object.assign(
    draft,
    job
      ? {
          title: job.title,
          role: job.role,
          employment_type: job.employment_type,
          province: job.province,
          city: job.city,
          remote: job.remote,
          insurance_lines: [...job.insurance_lines],
          salary_text: job.salary_text,
          expires_on: job.expires_on,
          description: job.description ?? '',
          requirements: job.requirements ?? null,
        }
      : blank(),
  );
  error.value = '';
  open.value = true;
}
async function run(action: () => Promise<unknown>, after?: () => void): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    await action();
    after?.();
    await load();
  } catch (exception) {
    error.value = errorMessage(exception, 'انجام نشد.');
  } finally {
    busy.value = false;
  }
}
async function showApplicants(job: JobPosting): Promise<void> {
  applicantsOf.value = job;
  applicants.value = await jobApplicants(job.id);
}
async function decide(applicant: Applicant, status: string): Promise<void> {
  if (!applicantsOf.value) return;
  await decideApplicant(applicantsOf.value.id, applicant.id, status);
  applicants.value = await jobApplicants(applicantsOf.value.id);
}
async function searchTalent(): Promise<void> {
  const params = new URLSearchParams();
  if (talentRole.value) params.set('role', talentRole.value);
  people.value = await talent(params).catch(() => []);
}
async function invite(person: TalentResume): Promise<void> {
  if (!inviteJob.value) return;
  await inviteTalent(person.id, inviteJob.value);
  notice.value = `دعوت برای ${person.name} فرستاده شد.`;
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
        <div class="eyebrow">کارفرما</div>
        <h1>آگهی‌های استخدام</h1>
      </div>
      <button class="btn btn--primary" :disabled="!meta?.profiles.length" @click="edit(null)">
        <q-icon name="add" size="18px" />آگهی جدید
      </button>
    </div>
    <div v-if="error && !open" class="notice notice--error">{{ error }}</div>
    <div v-if="notice" class="notice">{{ notice }}</div>
    <div class="profile-grid">
      <div>
        <div v-if="!jobs" class="skeleton" style="height: 200px" />
        <div v-else-if="!jobs.length" class="state">
          <q-icon name="work_outline" />هنوز آگهی ثبت نکرده‌اید.
        </div>
        <section v-for="job in jobs" :key="job.id" class="card">
          <div class="dashboard-head" style="margin: 0">
            <div>
              <b>{{ job.title }}</b>
              <small class="muted-text" style="display: block">
                {{ jobRoles[job.role] }} · {{ employmentTypes[job.employment_type] }} · تا
                {{ faDate(job.expires_on) }} · {{ faNumber(job.applications_count ?? 0) }} درخواست
              </small>
              <small v-if="job.review_note" class="muted-text" style="display: block">{{
                job.review_note
              }}</small>
            </div>
            <div class="stack-row">
              <StatusBadge :status="moderationStatuses[job.status ?? 'draft']" />
              <button class="btn btn--outline" @click="showApplicants(job)">درخواست‌ها</button>
              <button
                v-if="['draft', 'rejected', 'withdrawn'].includes(job.status ?? '')"
                class="btn btn--ghost"
                @click="edit(job)"
              >
                ویرایش
              </button>
              <button
                v-if="['pending', 'published'].includes(job.status ?? '')"
                class="btn btn--ghost"
                @click="run(() => withdrawJob(job.id))"
              >
                پس گرفتن
              </button>
            </div>
          </div>
          <template v-if="applicantsOf?.id === job.id">
            <p v-if="!applicants.length" class="muted-text">هنوز درخواستی نرسیده است.</p>
            <article v-for="applicant in applicants" :key="applicant.id" class="review">
              <header>
                <b>{{ applicant.name }}</b>
                <a :href="`mailto:${applicant.email}`" class="link" dir="ltr">{{
                  applicant.email
                }}</a>
                <StatusBadge :status="applicationStatuses[applicant.status]" />
              </header>
              <p v-if="applicant.resume" style="margin: 4px 0">
                {{ applicant.resume.headline }} ·
                {{ faNumber(applicant.resume.years_experience) }} سال سابقه
              </p>
              <p v-if="applicant.cover_letter" class="pre muted-text">
                {{ applicant.cover_letter }}
              </p>
              <div class="chips">
                <router-link
                  v-for="certificate in applicant.certificates"
                  :key="certificate.code"
                  :to="`/certificates/${certificate.code}`"
                  class="chip"
                >
                  <q-icon name="workspace_premium" size="14px" />{{ certificate.course }}
                </router-link>
              </div>
              <select
                class="select"
                style="width: auto; margin-top: 6px"
                :value="applicant.status"
                aria-label="وضعیت"
                @change="decide(applicant, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="(label, key) in meta?.application_statuses" :key="key" :value="key">
                  {{ label }}
                </option>
              </select>
            </article>
          </template>
        </section>
      </div>
      <aside>
        <form class="card" @submit.prevent="searchTalent">
          <h2><q-icon name="person_search" />جست‌وجوی رزومه</h2>
          <select v-model="talentRole" class="select">
            <option value="">همهٔ نقش‌ها</option>
            <option v-for="(label, key) in jobRoles" :key="key" :value="key">{{ label }}</option>
          </select>
          <button class="btn btn--outline btn--block">جست‌وجو</button>
          <p class="card__note">
            فقط رزومه‌های عمومی و بدون راه تماس نمایش داده می‌شوند؛ با دعوت، فرد خودش درخواست
            می‌دهد.
          </p>
          <label v-if="people?.length" class="field-label"
            >دعوت برای آگهی
            <select v-model="inviteJob" class="select">
              <option
                v-for="job in jobs?.filter((item) => item.status === 'published')"
                :key="job.id"
                :value="job.id"
              >
                {{ job.title }}
              </option>
            </select>
          </label>
          <div v-for="person in people ?? []" :key="person.id" class="review-item">
            <div>
              {{ person.name
              }}<small>{{ person.headline }} · {{ faNumber(person.years_experience) }} سال</small>
            </div>
            <button
              type="button"
              class="btn btn--ghost"
              :disabled="!inviteJob"
              @click="invite(person)"
            >
              دعوت
            </button>
          </div>
          <p v-if="people && !people.length" class="muted-text">رزومه‌ای پیدا نشد.</p>
        </form>
      </aside>
    </div>

    <q-dialog v-model="open">
      <form
        class="dialog-card"
        style="max-width: 680px"
        @submit.prevent="
          run(
            () => saveJob(profile, draft, editingId ?? undefined),
            () => (open = false),
          )
        "
      >
        <h2>{{ editingId ? 'ویرایش آگهی' : 'آگهی جدید' }}</h2>
        <label v-if="!editingId && (meta?.profiles.length ?? 0) > 1" class="field-label"
          >کارفرما
          <select v-model="profile" class="select">
            <option v-for="item in meta?.profiles" :key="item.slug" :value="item.slug">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="field-label"
          >عنوان<input v-model="draft.title" class="input" required minlength="5" maxlength="160"
        /></label>
        <div class="form-row">
          <label class="field-label"
            >نقش<select v-model="draft.role" class="select">
              <option v-for="(label, key) in jobRoles" :key="key" :value="key">{{ label }}</option>
            </select></label
          >
          <label class="field-label"
            >نوع همکاری<select v-model="draft.employment_type" class="select">
              <option v-for="(label, key) in employmentTypes" :key="key" :value="key">
                {{ label }}
              </option>
            </select></label
          >
          <label class="field-label"
            >استان
            <select v-model="draft.province" class="select" :required="!draft.remote">
              <option :value="null">—</option>
              <option v-for="item in directory.taxonomy?.provinces ?? []" :key="item">
                {{ item }}
              </option>
            </select>
          </label>
          <label class="field-label">شهر<input v-model="draft.city" class="input" /></label>
          <label class="field-label"
            >حقوق (اختیاری)<input
              v-model="draft.salary_text"
              class="input"
              maxlength="120"
              placeholder="مثلاً: توافقی"
          /></label>
          <label class="field-label"
            >مهلت<JalaliDateInput v-model="draft.expires_on" :min="localIsoDate()" required
          /></label>
        </div>
        <label class="check"><input v-model="draft.remote" type="checkbox" />امکان دورکاری</label>
        <label class="field-label"
          >شرح کار<textarea
            v-model="draft.description"
            class="textarea"
            required
            minlength="30"
            maxlength="5000"
          />
        </label>
        <label class="field-label"
          >شرایط (اختیاری)<textarea
            v-model="draft.requirements"
            class="textarea"
            maxlength="3000"
          />
        </label>
        <p class="hint">
          آگهی با شرط تبعیض‌آمیز یا دریافت وجه از داوطلب منتشر نمی‌شود. حداکثر مهلت
          {{ faNumber(meta?.max_days ?? 60) }} روز.
        </p>
        <div v-if="error" class="notice notice--error">{{ error }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="open = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ارسال برای بررسی</button>
        </div>
      </form>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
