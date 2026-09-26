<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { createPlacement, myPlacements, withdrawPlacement } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useDirectoryStore } from '../stores/directory';
import { errorMessage, faDate, faMoney, faNumber, moderationStatuses } from '../format';
import { localIsoDate } from '../jalali';
import type { MyPlacement, ProfileRef } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'معرفی ویژه | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const directory = useDirectoryStore();
const items = ref<MyPlacement[] | null>(null);
const slots = ref<Record<string, { label: string; price_30d: number }>>({});
const profiles = ref<ProfileRef[]>([]);
const maxDays = ref(90);
const open = ref(false);
const busy = ref(false);
const error = ref('');
const draft = reactive({
  actor_slug: '',
  placement: 'search',
  headline: '',
  insurance_lines: [] as string[],
  provinces: [] as string[],
  starts_on: localIsoDate(),
  ends_on: '',
});
const days = computed(() =>
  draft.starts_on && draft.ends_on
    ? Math.round(
        (new Date(draft.ends_on).getTime() - new Date(draft.starts_on).getTime()) / 86_400_000,
      ) + 1
    : 0,
);
const estimate = computed(() =>
  Math.ceil(((slots.value[draft.placement]?.price_30d ?? 0) * days.value) / 30),
);

async function load(): Promise<void> {
  const result = await myPlacements();
  items.value = result.data;
  slots.value = result.meta.slots;
  profiles.value = result.meta.profiles;
  maxDays.value = result.meta.max_days;
  draft.actor_slug ||= result.meta.profiles[0]?.slug ?? '';
}
function toggle(list: string[], value: string): void {
  const index = list.indexOf(value);
  if (index >= 0) list.splice(index, 1);
  else list.push(value);
}
async function save(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    await createPlacement({ ...draft });
    open.value = false;
    await load();
  } catch (exception) {
    error.value = errorMessage(exception, 'ثبت ممکن نشد.');
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
        <h1>معرفی ویژه</h1>
      </div>
      <button class="btn btn--primary" :disabled="!profiles.length" @click="open = true">
        <q-icon name="add" size="18px" />معرفی جدید
      </button>
    </div>
    <p class="muted-text" style="margin-top: -6px">
      معرفی ویژه با برچسب روشن «معرفی ویژه» و فقط برای کاربرانی نمایش داده می‌شود که رشته و استان
      انتخابی‌شان با هدف‌گیری شما هم‌خوان است. فقط پروفایل منتشرشده با دست‌کم یک نشان تأیید می‌تواند
      معرفی شود. پس از بررسی و پرداخت صورت‌حساب نمایش شروع می‌شود.
    </p>
    <div v-if="!items" class="skeleton" style="height: 200px" />
    <div v-else-if="!items.length" class="state">
      <q-icon name="auto_awesome" />هنوز معرفی ویژه‌ای ندارید.
    </div>
    <div v-else class="card compare-scroll" style="padding: 0">
      <table class="compare data-table">
        <thead>
          <tr>
            <th>جایگاه و متن</th>
            <th>بازه</th>
            <th>هزینه</th>
            <th>وضعیت</th>
            <th>نمایش / کلیک</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in items" :key="item.id">
            <td>
              <b>{{ slots[item.placement]?.label }}</b>
              <small class="muted-text" style="display: block">{{ item.headline }}</small>
            </td>
            <td>{{ faDate(item.starts_on) }} تا {{ faDate(item.ends_on) }}</td>
            <td>
              {{ faMoney(item.price) }}
              <small class="muted-text" style="display: block">{{
                item.paid ? 'پرداخت‌شده' : 'در انتظار پرداخت'
              }}</small>
            </td>
            <td>
              <StatusBadge :status="moderationStatuses[item.status]" />
              <small v-if="item.review_note" class="muted-text" style="display: block">{{
                item.review_note
              }}</small>
            </td>
            <td>{{ faNumber(item.impressions) }} / {{ faNumber(item.clicks) }}</td>
            <td>
              <button
                v-if="['pending', 'published'].includes(item.status)"
                class="btn btn--ghost"
                @click="withdrawPlacement(item.id).then(load)"
              >
                پس گرفتن
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="hint">
      <router-link to="/account/billing" class="link">صورت‌حساب‌ها و روش پرداخت</router-link>
    </p>

    <q-dialog v-model="open">
      <form class="dialog-card" style="max-width: 640px" @submit.prevent="save">
        <h2>معرفی ویژهٔ جدید</h2>
        <label v-if="profiles.length > 1" class="field-label">
          پروفایل
          <select v-model="draft.actor_slug" class="select">
            <option v-for="item in profiles" :key="item.slug" :value="item.slug">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="field-label">
          جایگاه
          <select v-model="draft.placement" class="select">
            <option v-for="(slot, key) in slots" :key="key" :value="key">
              {{ slot.label }} ({{ faMoney(slot.price_30d) }} برای ۳۰ روز)
            </option>
          </select>
        </label>
        <label class="field-label">
          متن کوتاه معرفی
          <input
            v-model="draft.headline"
            class="input"
            required
            minlength="10"
            maxlength="120"
            placeholder="مثلاً: متخصص بیمه‌های مهندسی پروژه‌های عمرانی"
          />
        </label>
        <fieldset class="field-label" style="border: 0; padding: 0">
          <legend>رشته‌های هدف (خالی = همه)</legend>
          <div class="chips">
            <button
              v-for="line in directory.taxonomy?.insurance_lines ?? []"
              :key="line"
              type="button"
              class="chip"
              :class="{ 'chip--on': draft.insurance_lines.includes(line) }"
              @click="toggle(draft.insurance_lines, line)"
            >
              {{ line }}
            </button>
          </div>
        </fieldset>
        <label class="field-label">
          استان‌های هدف (خالی = همه)
          <select v-model="draft.provinces" class="select" multiple size="4">
            <option v-for="item in directory.taxonomy?.provinces ?? []" :key="item">
              {{ item }}
            </option>
          </select>
        </label>
        <div class="form-row">
          <label class="field-label"
            >شروع<JalaliDateInput v-model="draft.starts_on" :min="localIsoDate()" required
          /></label>
          <label class="field-label"
            >پایان<JalaliDateInput v-model="draft.ends_on" required
          /></label>
        </div>
        <p v-if="days > 0" class="hint">
          {{ faNumber(days) }} روز · هزینهٔ برآوردی {{ faMoney(estimate) }} به‌علاوهٔ مالیات
          <template v-if="days > maxDays"> — حداکثر {{ faNumber(maxDays) }} روز مجاز است</template>
        </p>
        <div v-if="error" class="notice notice--error">{{ error }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="open = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">
            ارسال برای بررسی و صدور صورت‌حساب
          </button>
        </div>
      </form>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
