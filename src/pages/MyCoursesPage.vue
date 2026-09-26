<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { completeEnrollment, myCourses, saveCourse, saveExam, withdrawCourse } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useDirectoryStore } from '../stores/directory';
import {
  courseFormats,
  courseLevels,
  enrollmentStatuses,
  errorMessage,
  faMoneyShort,
  faNumber,
  moderationStatuses,
} from '../format';
import type { Course, CourseDraft, ExamQuestion, ProfileRef } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'دوره‌های من | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const directory = useDirectoryStore();
const courses = ref<Course[] | null>(null);
const profiles = ref<ProfileRef[]>([]);
const profile = ref('');
const open = ref(false);
const editingId = ref<number | null>(null);
const examFor = ref<Course | null>(null);
const passMark = ref(60);
const questions = ref<ExamQuestion[]>([]);
const busy = ref(false);
const error = ref('');
const draft = reactive<CourseDraft>(blank());

function blank(): CourseDraft {
  return {
    title: '',
    summary: '',
    body: null,
    level: 'basic',
    format: 'online',
    city: null,
    url: null,
    starts_on: null,
    duration_hours: 8,
    price: 0,
    capacity: null,
    insurance_lines: [],
  };
}
async function load(): Promise<void> {
  const result = await myCourses();
  courses.value = result.data;
  profiles.value = result.meta.profiles;
  profile.value ||= result.meta.profiles[0]?.slug ?? '';
}
function edit(course: Course | null): void {
  editingId.value = course?.id ?? null;
  Object.assign(
    draft,
    course
      ? {
          title: course.title,
          summary: course.summary,
          body: course.body ?? null,
          level: course.level,
          format: course.format,
          city: course.city,
          url: course.url,
          starts_on: course.starts_on,
          duration_hours: course.duration_hours,
          price: course.price,
          capacity: course.capacity,
          insurance_lines: [...course.insurance_lines],
        }
      : blank(),
  );
  error.value = '';
  open.value = true;
}
function editExam(course: Course): void {
  examFor.value = course;
  passMark.value = course.exam?.pass_mark ?? 60;
  questions.value = course.exam?.questions.map((question) => ({
    ...question,
    options: [...question.options],
  })) ?? [{ question: '', options: ['', ''], answer: 0 }];
  error.value = '';
}
async function run(action: () => Promise<unknown>, after?: () => void): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    await action();
    after?.();
    await load();
  } catch (exception) {
    error.value = errorMessage(exception, 'ذخیره ممکن نشد.');
  } finally {
    busy.value = false;
  }
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
        <div class="eyebrow">صاحب پروفایل</div>
        <h1>دوره‌های من</h1>
      </div>
      <button class="btn btn--primary" :disabled="!profiles.length" @click="edit(null)">
        <q-icon name="add" size="18px" />دورهٔ جدید
      </button>
    </div>
    <p class="muted-text" style="margin-top: -6px">
      دوره پس از بررسی منتشر می‌شود. با تعریف آزمون، گواهی پس از قبولی به‌طور خودکار صادر می‌شود؛
      بدون آزمون، پایان دوره را خودتان تأیید می‌کنید.
    </p>
    <div v-if="error && !open && !examFor" class="notice notice--error">{{ error }}</div>
    <div v-if="!courses" class="skeleton" style="height: 200px" />
    <div v-else-if="!courses.length" class="state">
      <q-icon name="school" />هنوز دوره‌ای ثبت نکرده‌اید.
    </div>
    <section v-for="course in courses" :key="course.id" class="card">
      <div class="dashboard-head" style="margin: 0">
        <div>
          <b>{{ course.title }}</b>
          <small class="muted-text" style="display: block">
            {{ courseFormats[course.format] }} · {{ courseLevels[course.level] }} ·
            {{ faNumber(course.duration_hours) }} ساعت ·
            {{ course.price ? faMoneyShort(course.price) : 'رایگان' }}
          </small>
          <small v-if="course.review_note" class="muted-text" style="display: block">{{
            course.review_note
          }}</small>
        </div>
        <div class="stack-row">
          <StatusBadge :status="moderationStatuses[course.status ?? 'draft']" />
          <button class="btn btn--ghost" @click="editExam(course)">
            {{ course.exam ? 'ویرایش آزمون' : 'تعریف آزمون' }}
          </button>
          <button
            v-if="['draft', 'rejected', 'withdrawn'].includes(course.status ?? '')"
            class="btn btn--ghost"
            @click="edit(course)"
          >
            ویرایش
          </button>
          <button
            v-if="['pending', 'published'].includes(course.status ?? '')"
            class="btn btn--ghost"
            @click="run(() => withdrawCourse(course.id))"
          >
            پس گرفتن
          </button>
        </div>
      </div>
      <table v-if="course.enrollments?.length" class="line-table">
        <thead>
          <tr>
            <th>شرکت‌کننده</th>
            <th>وضعیت</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="enrollment in course.enrollments" :key="enrollment.id">
            <td>
              {{ enrollment.name }}
              <small class="muted-text" dir="ltr">{{ enrollment.email }}</small>
            </td>
            <td><StatusBadge :status="enrollmentStatuses[enrollment.status]" /></td>
            <td>
              <button
                v-if="enrollment.status === 'enrolled' && !course.exam"
                class="btn btn--ghost"
                @click="run(() => completeEnrollment(course.id, enrollment.id))"
              >
                تأیید پایان دوره
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <q-dialog v-model="open">
      <form
        class="dialog-card"
        style="max-width: 680px"
        @submit.prevent="
          run(
            () => saveCourse(profile, draft, editingId ?? undefined),
            () => (open = false),
          )
        "
      >
        <h2>{{ editingId ? 'ویرایش دوره' : 'دورهٔ جدید' }}</h2>
        <label v-if="!editingId && profiles.length > 1" class="field-label"
          >برگزارکننده
          <select v-model="profile" class="select">
            <option v-for="item in profiles" :key="item.slug" :value="item.slug">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="field-label"
          >عنوان<input v-model="draft.title" class="input" required minlength="5" maxlength="160"
        /></label>
        <label class="field-label"
          >خلاصه<input
            v-model="draft.summary"
            class="input"
            required
            minlength="20"
            maxlength="300"
        /></label>
        <label class="field-label"
          >سرفصل و توضیح<textarea v-model="draft.body" class="textarea" maxlength="5000" />
        </label>
        <div class="form-row">
          <label class="field-label"
            >سطح<select v-model="draft.level" class="select">
              <option v-for="(label, key) in courseLevels" :key="key" :value="key">
                {{ label }}
              </option>
            </select></label
          >
          <label class="field-label"
            >نوع<select v-model="draft.format" class="select">
              <option v-for="(label, key) in courseFormats" :key="key" :value="key">
                {{ label }}
              </option>
            </select></label
          >
          <label v-if="draft.format !== 'online'" class="field-label"
            >شهر<input v-model="draft.city" class="input" required
          /></label>
          <label class="field-label"
            >مدت (ساعت)<input
              v-model.number="draft.duration_hours"
              class="input"
              type="number"
              min="1"
              dir="ltr"
              required
          /></label>
          <label class="field-label"
            >هزینه (ریال، ۰ = رایگان)<input
              v-model.number="draft.price"
              class="input"
              type="number"
              min="0"
              dir="ltr"
              required
          /></label>
          <label class="field-label"
            >ظرفیت (اختیاری)<input
              v-model.number="draft.capacity"
              class="input"
              type="number"
              min="1"
              dir="ltr"
          /></label>
          <label class="field-label"
            >شروع (اختیاری)<JalaliDateInput v-model="draft.starts_on"
          /></label>
          <label class="field-label"
            >پیوند دوره (اختیاری)<input v-model="draft.url" class="input" type="url" dir="ltr"
          /></label>
        </div>
        <label class="field-label"
          >رشته‌ها
          <select v-model="draft.insurance_lines" class="select" multiple size="4">
            <option v-for="line in directory.taxonomy?.insurance_lines ?? []" :key="line">
              {{ line }}
            </option>
          </select>
        </label>
        <div v-if="error" class="notice notice--error">{{ error }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="open = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ارسال برای بررسی</button>
        </div>
      </form>
    </q-dialog>

    <q-dialog :model-value="examFor !== null" @update:model-value="examFor = null">
      <form
        class="dialog-card"
        style="max-width: 720px"
        @submit.prevent="
          run(
            () => saveExam(examFor!.id, passMark, questions),
            () => (examFor = null),
          )
        "
      >
        <h2>آزمون «{{ examFor?.title }}»</h2>
        <label class="field-label"
          >نمرهٔ قبولی (درصد)<input
            v-model.number="passMark"
            class="input"
            type="number"
            min="30"
            max="100"
            dir="ltr"
            required
        /></label>
        <fieldset v-for="(question, index) in questions" :key="index" class="exam-question">
          <legend>پرسش {{ faNumber(index + 1) }}</legend>
          <input
            v-model="question.question"
            class="input"
            required
            minlength="5"
            placeholder="متن پرسش"
          />
          <label v-for="(option, optionIndex) in question.options" :key="optionIndex" class="check">
            <input
              v-model="question.answer"
              type="radio"
              :name="`a${index}`"
              :value="optionIndex"
              aria-label="پاسخ درست"
            />
            <input
              v-model="question.options[optionIndex]"
              class="input"
              required
              :placeholder="`گزینهٔ ${faNumber(optionIndex + 1)}`"
            />
          </label>
          <div class="stack-row">
            <button
              v-if="question.options.length < 6"
              type="button"
              class="btn btn--ghost"
              @click="question.options.push('')"
            >
              گزینهٔ دیگر
            </button>
            <button
              v-if="questions.length > 1"
              type="button"
              class="btn btn--ghost"
              @click="questions.splice(index, 1)"
            >
              حذف پرسش
            </button>
          </div>
        </fieldset>
        <button
          type="button"
          class="btn btn--outline"
          @click="questions.push({ question: '', options: ['', ''], answer: 0 })"
        >
          پرسش دیگر
        </button>
        <p class="hint">
          گزینهٔ درست هر پرسش را با دکمهٔ رادیویی کنارش مشخص کنید؛ حداقل سه پرسش لازم است.
        </p>
        <div v-if="error" class="notice notice--error">{{ error }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="examFor = null">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ذخیرهٔ آزمون</button>
        </div>
      </form>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
