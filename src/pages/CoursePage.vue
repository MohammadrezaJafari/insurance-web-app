<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { enrollCourse, getCourse } from '../api';
import { useAuthStore } from '../stores/auth';
import { courseFormats, courseLevels, errorMessage, faDate, faMoney, faNumber } from '../format';
import type { Course } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const course = ref<Course | null>(null);
const error = ref('');
const busy = ref(false);

useMeta(() => ({
  title: course.value ? `${course.value.title} | آموزش اینشورهاب` : 'دوره | اینشورهاب',
}));

async function load(): Promise<void> {
  course.value = await getCourse(Number(route.params.id));
}
async function enroll(): Promise<void> {
  if (!auth.loggedIn) {
    await router.push({ path: '/account', query: { redirect: route.fullPath } });
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await enrollCourse(Number(route.params.id));
    await router.push('/account/learning');
  } catch (exception) {
    error.value = errorMessage(exception, 'ثبت‌نام ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
onMounted(async () => {
  await auth.restore();
  await load().catch(() => (error.value = 'دوره پیدا نشد.'));
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/learn">آموزش</router-link><q-icon name="chevron_left" /><span>{{
        course?.title ?? 'دوره'
      }}</span>
    </nav>
    <div v-if="!course && error" class="state state--error">{{ error }}</div>
    <div v-else-if="!course" class="skeleton" style="height: 240px" />
    <div v-else class="profile-grid">
      <article class="card">
        <h1 style="font-size: 24px; margin: 0 0 6px">{{ course.title }}</h1>
        <p class="muted-text">{{ course.summary }}</p>
        <p v-if="course.body" class="pre">{{ course.body }}</p>
        <div class="chips">
          <span v-for="line in course.insurance_lines" :key="line" class="chip">{{ line }}</span>
        </div>
      </article>
      <aside>
        <section class="card">
          <div class="kv">
            <b>برگزارکننده</b>
            <router-link
              v-if="course.provider"
              :to="`/profiles/${course.provider.slug}`"
              class="link"
              >{{ course.provider.name }}</router-link
            >
          </div>
          <div class="kv">
            <b>نوع</b
            ><span
              >{{ courseFormats[course.format]
              }}<template v-if="course.city"> · {{ course.city }}</template></span
            >
          </div>
          <div class="kv">
            <b>سطح</b><span>{{ courseLevels[course.level] }}</span>
          </div>
          <div class="kv">
            <b>مدت</b><span>{{ faNumber(course.duration_hours) }} ساعت</span>
          </div>
          <div v-if="course.starts_on" class="kv">
            <b>شروع</b><span>{{ faDate(course.starts_on) }}</span>
          </div>
          <div class="kv">
            <b>هزینه</b><span>{{ course.price ? faMoney(course.price) : 'رایگان' }}</span>
          </div>
          <div v-if="course.seats_left !== null" class="kv">
            <b>ظرفیت باقی‌مانده</b><span>{{ faNumber(course.seats_left) }}</span>
          </div>
          <div class="kv">
            <b>گواهی</b
            ><span>{{ course.has_exam ? 'پس از قبولی در آزمون' : 'با تأیید برگزارکننده' }}</span>
          </div>
          <div v-if="error" class="notice notice--error">{{ error }}</div>
          <router-link
            v-if="course.enrollment"
            to="/account/learning"
            class="btn btn--outline btn--block"
            >مشاهده در آموزش‌های من</router-link
          >
          <button
            v-else
            class="btn btn--primary btn--block"
            :disabled="busy || course.seats_left === 0"
            @click="enroll"
          >
            {{ course.price ? 'ثبت‌نام و صدور صورت‌حساب' : 'ثبت‌نام' }}
          </button>
          <a
            v-if="course.url"
            :href="course.url"
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="link"
            style="display: block; margin-top: 8px"
            >صفحهٔ دوره نزد برگزارکننده</a
          >
        </section>
      </aside>
    </div>
  </main>
  <SiteFooter />
</template>
