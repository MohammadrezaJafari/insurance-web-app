<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { listJobs } from '../api';
import { useDirectoryStore } from '../stores/directory';
import { employmentTypes, faDate, jobRoles } from '../format';
import type { JobPosting } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

useMeta({
  title: 'فرصت‌های شغلی صنعت بیمه | اینشورهاب',
  meta: {
    description: {
      name: 'description',
      content: 'آگهی‌های استخدام شرکت‌های بیمه، کارگزاران، نمایندگان و ارزیابان.',
    },
  },
});

const route = useRoute();
const router = useRouter();
const directory = useDirectoryStore();
const jobs = ref<JobPosting[] | null>(null);
const role = ref(String(route.query.role ?? ''));
const province = ref(String(route.query.province ?? ''));

async function load(): Promise<void> {
  const params = new URLSearchParams();
  if (role.value) params.set('role', role.value);
  if (province.value) params.set('province', province.value);
  jobs.value = await listJobs(params).catch(() => []);
}
function apply(): void {
  void router.replace({
    query: { role: role.value || undefined, province: province.value || undefined },
  });
}
watch(() => route.query, load);
onMounted(async () => {
  await Promise.all([load(), directory.loadTaxonomy().catch(() => undefined)]);
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">بازار کار صنعت بیمه</div>
        <h1>فرصت‌های شغلی</h1>
      </div>
      <router-link to="/account/resume" class="btn btn--outline"
        ><q-icon name="badge" size="18px" />رزومهٔ من</router-link
      >
    </div>
    <form class="toolbar" @submit.prevent="apply">
      <select
        v-model="role"
        class="select"
        style="width: auto; margin: 0"
        aria-label="نقش"
        @change="apply"
      >
        <option value="">همهٔ نقش‌ها</option>
        <option v-for="(label, key) in jobRoles" :key="key" :value="key">{{ label }}</option>
      </select>
      <select
        v-model="province"
        class="select"
        style="width: auto; margin: 0"
        aria-label="استان"
        @change="apply"
      >
        <option value="">همهٔ استان‌ها</option>
        <option v-for="item in directory.taxonomy?.provinces ?? []" :key="item">{{ item }}</option>
      </select>
    </form>
    <div v-if="!jobs" class="skeleton" style="height: 240px" />
    <div v-else-if="!jobs.length" class="state">
      <q-icon name="work_outline" />آگهی فعالی با این فیلترها نیست.
    </div>
    <div v-else class="card-grid">
      <router-link
        v-for="job in jobs"
        :key="job.id"
        :to="`/jobs/${job.id}`"
        class="card offer-card"
      >
        <div class="offer-card__head">
          <span class="badge badge--brand">{{ jobRoles[job.role] }}</span>
          <small class="muted-text">تا {{ faDate(job.expires_on) }}</small>
        </div>
        <h3>{{ job.title }}</h3>
        <p class="muted-text" style="margin: 0">
          {{ employmentTypes[job.employment_type] }} · {{ job.remote ? 'دورکاری' : job.province }}
          <template v-if="job.salary_text"> · {{ job.salary_text }}</template>
        </p>
        <footer v-if="job.employer" class="offer-card__provider">{{ job.employer.name }}</footer>
      </router-link>
    </div>
  </main>
  <SiteFooter />
</template>
