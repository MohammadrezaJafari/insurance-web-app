<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { listCourses } from '../api';
import { useDirectoryStore } from '../stores/directory';
import { courseFormats, courseLevels, faMoneyShort, faNumber } from '../format';
import type { Course } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

useMeta({
  title: 'آموزش تخصصی بیمه | اینشورهاب',
  meta: {
    description: {
      name: 'description',
      content: 'دوره‌های تخصصی صنعت بیمه با آزمون و گواهی قابل استعلام.',
    },
  },
});

const route = useRoute();
const router = useRouter();
const directory = useDirectoryStore();
const courses = ref<Course[] | null>(null);
const line = ref(String(route.query.line ?? ''));
const format = ref(String(route.query.format ?? ''));

async function load(): Promise<void> {
  const params = new URLSearchParams();
  if (line.value) params.set('line', line.value);
  if (format.value) params.set('format', format.value);
  courses.value = await listCourses(params).catch(() => []);
}
function apply(): void {
  void router.replace({
    query: { line: line.value || undefined, format: format.value || undefined },
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
        <div class="eyebrow">آموزش</div>
        <h1>دوره‌های تخصصی صنعت بیمه</h1>
      </div>
      <router-link to="/account/learning" class="btn btn--ghost"
        ><q-icon name="school" size="18px" />آموزش‌های من</router-link
      >
    </div>
    <form class="toolbar" @submit.prevent="apply">
      <select
        v-model="line"
        class="select"
        style="width: auto; margin: 0"
        aria-label="رشته"
        @change="apply"
      >
        <option value="">همهٔ رشته‌ها</option>
        <option v-for="item in directory.taxonomy?.insurance_lines ?? []" :key="item">
          {{ item }}
        </option>
      </select>
      <select
        v-model="format"
        class="select"
        style="width: auto; margin: 0"
        aria-label="نوع برگزاری"
        @change="apply"
      >
        <option value="">همهٔ انواع</option>
        <option v-for="(label, key) in courseFormats" :key="key" :value="key">{{ label }}</option>
      </select>
    </form>
    <div v-if="!courses" class="skeleton" style="height: 240px" />
    <div v-else-if="!courses.length" class="state">
      <q-icon name="school" />دوره‌ای با این فیلترها نیست.
    </div>
    <div v-else class="card-grid">
      <router-link
        v-for="course in courses"
        :key="course.id"
        :to="`/learn/${course.id}`"
        class="card offer-card"
      >
        <div class="offer-card__head">
          <span class="badge badge--brand">{{ courseFormats[course.format] }}</span>
          <small class="muted-text"
            >{{ courseLevels[course.level] }} · {{ faNumber(course.duration_hours) }} ساعت</small
          >
        </div>
        <h3>{{ course.title }}</h3>
        <p class="muted-text" style="margin: 0">{{ course.summary }}</p>
        <div class="chips">
          <span v-if="course.has_exam" class="chip"
            ><q-icon name="quiz" size="14px" />آزمون و گواهی</span
          >
          <span class="chip">{{ course.price ? faMoneyShort(course.price) : 'رایگان' }}</span>
        </div>
        <footer v-if="course.provider" class="offer-card__provider">
          {{ course.provider.name }}
        </footer>
      </router-link>
    </div>
  </main>
  <SiteFooter />
</template>
