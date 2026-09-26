<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { getExam, myLearning, submitExam } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { enrollmentStatuses, errorMessage, faNumber } from '../format';
import type { ExamQuestion, LearningItem } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'آموزش‌های من | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const items = ref<LearningItem[] | null>(null);
const exam = ref<{ enrollment: LearningItem; pass_mark: number; questions: ExamQuestion[] } | null>(
  null,
);
const answers = ref<(number | null)[]>([]);
const result = ref<{ score: number; passed: boolean; certificate_code: string | null } | null>(
  null,
);
const error = ref('');

async function load(): Promise<void> {
  items.value = await myLearning();
}
async function start(item: LearningItem): Promise<void> {
  error.value = '';
  result.value = null;
  try {
    const loaded = await getExam(item.id);
    exam.value = { enrollment: item, ...loaded };
    answers.value = loaded.questions.map(() => null);
  } catch (exception) {
    error.value = errorMessage(exception);
  }
}
async function submit(): Promise<void> {
  if (!exam.value) return;
  try {
    result.value = await submitExam(exam.value.enrollment.id, answers.value);
    await load();
  } catch (exception) {
    error.value = errorMessage(exception);
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
        <div class="eyebrow">آموزش</div>
        <h1>آموزش‌های من</h1>
      </div>
      <router-link to="/learn" class="btn btn--outline">دوره‌ها</router-link>
    </div>
    <div v-if="error" class="notice notice--error">{{ error }}</div>

    <section v-if="exam" class="card">
      <h2><q-icon name="quiz" />آزمون «{{ exam.enrollment.course.title }}»</h2>
      <p class="muted-text">
        نمرهٔ قبولی {{ faNumber(exam.pass_mark) }}٪ ·
        {{ faNumber(exam.enrollment.attempts_left) }} فرصت باقی‌مانده
      </p>
      <template v-if="!result">
        <fieldset v-for="(question, index) in exam.questions" :key="index" class="exam-question">
          <legend>{{ faNumber(index + 1) }}. {{ question.question }}</legend>
          <label v-for="(option, optionIndex) in question.options" :key="optionIndex" class="check">
            <input
              v-model="answers[index]"
              type="radio"
              :name="`q${index}`"
              :value="optionIndex"
            />{{ option }}
          </label>
        </fieldset>
        <div class="dialog-actions">
          <button class="btn btn--ghost" @click="exam = null">انصراف</button>
          <button
            class="btn btn--primary"
            :disabled="answers.some((answer) => answer === null)"
            @click="submit"
          >
            ثبت پاسخ‌ها
          </button>
        </div>
      </template>
      <div v-else class="notice" :class="{ 'notice--error': !result.passed }">
        نمرهٔ شما {{ faNumber(result.score) }}٪ —
        <template v-if="result.passed"
          >قبول شدید. کد گواهی:
          <router-link :to="`/certificates/${result.certificate_code}`" class="link" dir="ltr">{{
            result.certificate_code
          }}</router-link>
        </template>
        <template v-else>قبول نشدید.</template>
      </div>
    </section>

    <div v-if="!items" class="skeleton" style="height: 200px" />
    <div v-else-if="!items.length" class="state">
      <q-icon name="school" />هنوز در دوره‌ای ثبت‌نام نکرده‌اید.
    </div>
    <div v-else class="card">
      <div v-for="item in items" :key="item.id" class="review-item">
        <div>
          <router-link :to="`/learn/${item.course.id}`" class="link">{{
            item.course.title
          }}</router-link>
          <small>
            {{ item.course.provider?.name }}
            <template v-if="item.best_score !== null">
              · بهترین نمره {{ faNumber(item.best_score) }}٪</template
            >
          </small>
        </div>
        <StatusBadge :status="enrollmentStatuses[item.status]" />
        <router-link
          v-if="item.certificate_code"
          :to="`/certificates/${item.certificate_code}`"
          class="btn btn--ghost"
          >گواهی</router-link
        >
        <button
          v-else-if="item.status === 'enrolled' && item.course.has_exam && item.attempts_left > 0"
          class="btn btn--outline"
          @click="start(item)"
        >
          آزمون
        </button>
        <router-link
          v-else-if="item.status === 'pending_payment'"
          to="/account/billing"
          class="btn btn--ghost"
          >پرداخت</router-link
        >
      </div>
    </div>
  </main>
  <SiteFooter />
</template>
