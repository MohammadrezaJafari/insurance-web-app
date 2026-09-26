<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { applyJob, getJob } from '../api';
import { useAuthStore } from '../stores/auth';
import { employmentTypes, errorMessage, faDate, jobRoles } from '../format';
import type { JobPosting } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const job = ref<JobPosting | null>(null);
const cover = ref('');
const error = ref('');
const done = ref(false);
const busy = ref(false);
useMeta(() => ({ title: job.value ? `${job.value.title} | اینشورهاب` : 'آگهی شغلی | اینشورهاب' }));

async function apply(): Promise<void> {
  if (!auth.loggedIn) {
    await router.push({ path: '/account', query: { redirect: route.fullPath } });
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await applyJob(Number(route.params.id), cover.value.trim() || null);
    done.value = true;
  } catch (exception) {
    error.value = errorMessage(exception, 'ارسال ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
onMounted(async () => {
  await auth.restore();
  job.value = await getJob(Number(route.params.id)).catch(() => {
    error.value = 'این آگهی پیدا نشد یا مهلتش تمام شده است.';
    return null;
  });
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/jobs">فرصت‌های شغلی</router-link><q-icon name="chevron_left" /><span>{{
        job?.title ?? 'آگهی'
      }}</span>
    </nav>
    <div v-if="!job && error" class="state state--error">{{ error }}</div>
    <div v-else-if="!job" class="skeleton" style="height: 240px" />
    <div v-else class="profile-grid">
      <article class="card">
        <span class="badge badge--brand">{{ jobRoles[job.role] }}</span>
        <h1 style="font-size: 24px; margin: 10px 0 4px">{{ job.title }}</h1>
        <p class="muted-text">
          {{ employmentTypes[job.employment_type] }} ·
          {{ job.remote ? 'دورکاری' : `${job.province ?? ''} ${job.city ?? ''}` }}
          <template v-if="job.salary_text"> · {{ job.salary_text }}</template> · مهلت
          {{ faDate(job.expires_on) }}
        </p>
        <h2>شرح کار</h2>
        <p class="pre">{{ job.description }}</p>
        <template v-if="job.requirements"
          ><h2>شرایط</h2>
          <p class="pre">{{ job.requirements }}</p></template
        >
        <div class="chips">
          <span v-for="line in job.insurance_lines" :key="line" class="chip">{{ line }}</span>
        </div>
      </article>
      <aside>
        <section class="card">
          <h2><q-icon name="business" />کارفرما</h2>
          <router-link v-if="job.employer" :to="`/profiles/${job.employer.slug}`" class="link">{{
            job.employer.name
          }}</router-link>
          <div v-if="done || job.applied" class="notice" style="margin-top: 12px">
            درخواست شما ارسال شد؛ وضعیت را در «رزومهٔ من» ببینید.
          </div>
          <form v-else class="stack" style="margin-top: 12px" @submit.prevent="apply">
            <textarea
              v-model="cover"
              class="textarea"
              maxlength="3000"
              placeholder="چند خط معرفی (اختیاری)"
              aria-label="معرفی"
            />
            <div v-if="error" class="notice notice--error">
              {{ error }}
              <router-link v-if="error.includes('رزومه')" to="/account/resume" class="link"
                >تکمیل رزومه</router-link
              >
            </div>
            <button class="btn btn--primary btn--block" :disabled="busy">
              ارسال درخواست همکاری
            </button>
            <p class="card__note">
              با ارسال درخواست، رزومه و ایمیل شما برای همین کارفرما قابل مشاهده می‌شود.
            </p>
          </form>
        </section>
      </aside>
    </div>
  </main>
  <SiteFooter />
</template>
