<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { jobMatches, myApplications, myResume, saveResume } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useDirectoryStore } from '../stores/directory';
import { applicationStatuses, errorMessage, faDate, faNumber, jobRoles } from '../format';
import type { CertificateRef, JobPosting, ResumeData } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'رزومهٔ من | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const directory = useDirectoryStore();
const resume = reactive<ResumeData>({
  headline: '',
  summary: null,
  province: null,
  city: null,
  years_experience: 0,
  insurance_lines: [],
  roles: [],
  experience: [],
  visibility: 'private',
});
const certificates = ref<CertificateRef[]>([]);
const applications = ref<{ id: number; status: string; created_at: string; job: JobPosting }[]>([]);
const matches = ref<JobPosting[]>([]);
const busy = ref(false);
const message = ref('');
const error = ref('');

function toggle(list: string[], value: string): void {
  const index = list.indexOf(value);
  if (index >= 0) list.splice(index, 1);
  else list.push(value);
}
async function save(): Promise<void> {
  busy.value = true;
  error.value = '';
  message.value = '';
  try {
    await saveResume(resume);
    message.value = 'رزومه ذخیره شد.';
    matches.value = await jobMatches();
  } catch (exception) {
    error.value = errorMessage(exception, 'ذخیره ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
onMounted(async () => {
  if (!(await requireAuth())) return;
  const [loaded, apps, fits] = await Promise.all([
    myResume(),
    myApplications(),
    jobMatches(),
    directory.loadTaxonomy().catch(() => undefined),
  ]);
  if (loaded.data)
    Object.assign(resume, {
      ...loaded.data,
      experience: loaded.data.experience ?? [],
      roles: loaded.data.roles ?? [],
      insurance_lines: loaded.data.insurance_lines ?? [],
    });
  certificates.value = loaded.certificates;
  applications.value = apps;
  matches.value = fits;
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">بازار کار</div>
        <h1>رزومهٔ من</h1>
      </div>
      <router-link to="/jobs" class="btn btn--outline">فرصت‌های شغلی</router-link>
    </div>
    <div class="profile-grid">
      <form class="card" @submit.prevent="save">
        <h2><q-icon name="badge" />رزومهٔ تخصصی</h2>
        <label class="field-label"
          >عنوان<input
            v-model="resume.headline"
            class="input"
            required
            minlength="5"
            maxlength="160"
            placeholder="مثلاً: ارزیاب خسارت آتش‌سوزی با ۸ سال سابقه"
        /></label>
        <label class="field-label"
          >خلاصه<textarea v-model="resume.summary" class="textarea" maxlength="3000" />
        </label>
        <div class="form-row">
          <label class="field-label"
            >سال‌های سابقه<input
              v-model.number="resume.years_experience"
              class="input"
              type="number"
              min="0"
              max="60"
              dir="ltr"
          /></label>
          <label class="field-label"
            >استان
            <select v-model="resume.province" class="select">
              <option :value="null">—</option>
              <option v-for="item in directory.taxonomy?.provinces ?? []" :key="item">
                {{ item }}
              </option>
            </select>
          </label>
        </div>
        <fieldset class="field-label" style="border: 0; padding: 0">
          <legend>نقش‌های مورد علاقه</legend>
          <div class="chips">
            <button
              v-for="(label, key) in jobRoles"
              :key="key"
              type="button"
              class="chip"
              :class="{ 'chip--on': resume.roles.includes(key) }"
              @click="toggle(resume.roles, key)"
            >
              {{ label }}
            </button>
          </div>
        </fieldset>
        <fieldset class="field-label" style="border: 0; padding: 0">
          <legend>رشته‌های تخصصی</legend>
          <div class="chips">
            <button
              v-for="line in directory.taxonomy?.insurance_lines ?? []"
              :key="line"
              type="button"
              class="chip"
              :class="{ 'chip--on': resume.insurance_lines.includes(line) }"
              @click="toggle(resume.insurance_lines, line)"
            >
              {{ line }}
            </button>
          </div>
        </fieldset>
        <fieldset class="field-label" style="border: 0; padding: 0">
          <legend>سوابق</legend>
          <div v-for="(item, index) in resume.experience" :key="index" class="exam-question">
            <div class="form-row">
              <input
                v-model="item.title"
                class="input"
                required
                placeholder="سمت"
                aria-label="سمت"
              />
              <input
                v-model="item.organization"
                class="input"
                required
                placeholder="سازمان"
                aria-label="سازمان"
              />
              <input
                v-model.number="item.from_year"
                class="input"
                type="number"
                min="1330"
                max="1500"
                required
                placeholder="از سال"
                dir="ltr"
                aria-label="از سال"
              />
              <input
                v-model.number="item.to_year"
                class="input"
                type="number"
                min="1330"
                max="1500"
                placeholder="تا سال (خالی = اکنون)"
                dir="ltr"
                aria-label="تا سال"
              />
            </div>
            <button
              type="button"
              class="btn btn--ghost"
              @click="resume.experience.splice(index, 1)"
            >
              حذف
            </button>
          </div>
          <button
            type="button"
            class="btn btn--outline"
            @click="
              resume.experience.push({
                title: '',
                organization: '',
                from_year: null,
                to_year: null,
                description: null,
              })
            "
          >
            افزودن سابقه
          </button>
        </fieldset>
        <label class="check"
          ><input
            v-model="resume.visibility"
            type="checkbox"
            true-value="public"
            false-value="private"
          />کارفرمایان اینشورهاب بتوانند رزومه‌ام را ببینند (بدون ایمیل و تلفن)</label
        >
        <div v-if="message" class="notice">{{ message }}</div>
        <div v-if="error" class="notice notice--error">{{ error }}</div>
        <button class="btn btn--primary" :disabled="busy">ذخیرهٔ رزومه</button>
      </form>
      <aside>
        <section class="card">
          <h2><q-icon name="workspace_premium" />گواهی‌های اینشورهاب</h2>
          <p v-if="!certificates.length" class="muted-text">
            هنوز گواهی ندارید. <router-link to="/learn" class="link">دوره‌ها</router-link>
          </p>
          <router-link
            v-for="item in certificates"
            :key="item.code"
            :to="`/certificates/${item.code}`"
            class="review-item"
          >
            <div>
              {{ item.course }}<small>{{ faDate(item.completed_at) }}</small>
            </div>
          </router-link>
        </section>
        <section class="card">
          <h2><q-icon name="recommend" />آگهی‌های متناسب</h2>
          <p v-if="!matches.length" class="muted-text">
            با تکمیل نقش‌ها و رشته‌ها، آگهی‌های متناسب اینجا می‌آیند.
          </p>
          <router-link
            v-for="job in matches"
            :key="job.id"
            :to="`/jobs/${job.id}`"
            class="review-item"
          >
            <div>
              {{ job.title
              }}<small>{{ job.employer?.name }} · تناسب {{ faNumber(job.fit ?? 0) }}٪</small>
            </div>
          </router-link>
        </section>
        <section class="card">
          <h2><q-icon name="send" />درخواست‌های من</h2>
          <p v-if="!applications.length" class="muted-text">درخواستی نفرستاده‌اید.</p>
          <div v-for="item in applications" :key="item.id" class="review-item">
            <div>
              {{ item.job.title
              }}<small>{{ item.job.employer?.name }} · {{ faDate(item.created_at) }}</small>
            </div>
            <StatusBadge :status="applicationStatuses[item.status]" />
          </div>
        </section>
      </aside>
    </div>
  </main>
  <SiteFooter />
</template>
