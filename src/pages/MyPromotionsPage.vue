<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import {
  createPromotion,
  deletePromotion,
  myPromotions,
  promotionAction,
  updatePromotion,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useDirectoryStore } from '../stores/directory';
import { errorMessage, faDate, faNumber, moderationStatuses } from '../format';
import { localIsoDate } from '../jalali';
import type { Offer, OfferDraft, OfferMeta } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'پیشنهادهای ویژهٔ من | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const directory = useDirectoryStore();
const items = ref<Offer[] | null>(null);
const meta = ref<OfferMeta | null>(null);
const error = ref('');
const formError = ref('');
const busy = ref(false);
const open = ref(false);
const editingId = ref<number | null>(null);
const profile = ref('');
const draft = reactive<OfferDraft>(blank());
const canDiscount = computed(
  () => meta.value?.profiles.find((item) => item.slug === profile.value)?.can_discount ?? false,
);

function blank(): OfferDraft {
  return {
    kind: 'service',
    title: '',
    body: '',
    insurance_lines: [],
    provinces: [],
    services: [],
    discount_text: null,
    regulatory_reference: null,
    starts_on: localIsoDate(),
    ends_on: '',
  };
}
function toggle(list: string[], value: string): void {
  const index = list.indexOf(value);
  if (index >= 0) list.splice(index, 1);
  else list.push(value);
}
async function load(): Promise<void> {
  try {
    const result = await myPromotions();
    items.value = result.data;
    meta.value = result.meta;
    profile.value ||= result.meta.profiles[0]?.slug ?? '';
  } catch {
    error.value = 'دریافت فهرست ممکن نشد.';
  }
}
function edit(offer: Offer | null): void {
  formError.value = '';
  editingId.value = offer?.id ?? null;
  if (offer) {
    profile.value = offer.provider?.slug ?? profile.value;
    Object.assign(draft, {
      kind: offer.kind,
      title: offer.title,
      body: offer.body,
      insurance_lines: [...offer.insurance_lines],
      provinces: [...offer.provinces],
      services: [...offer.services],
      discount_text: offer.discount_text,
      regulatory_reference: offer.regulatory_reference,
      starts_on: offer.starts_on,
      ends_on: offer.ends_on,
    });
  } else {
    Object.assign(draft, blank());
  }
  open.value = true;
}
async function save(submit: boolean): Promise<void> {
  busy.value = true;
  formError.value = '';
  try {
    const payload = { ...draft, discount_text: canDiscount.value ? draft.discount_text : null };
    const saved = editingId.value
      ? await updatePromotion(editingId.value, payload)
      : await createPromotion(profile.value, payload);
    if (submit) await promotionAction(saved.id, 'submit');
    open.value = false;
    await load();
  } catch (exception) {
    formError.value = errorMessage(exception, 'ثبت ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
async function act(offer: Offer, action: 'submit' | 'withdraw' | 'delete'): Promise<void> {
  error.value = '';
  try {
    if (action === 'delete') {
      if (!window.confirm('این پیشنهاد حذف شود؟')) return;
      await deletePromotion(offer.id);
    } else {
      await promotionAction(offer.id, action);
    }
    await load();
  } catch (exception) {
    error.value = errorMessage(exception);
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
        <h1>پیشنهادهای ویژهٔ من</h1>
      </div>
      <button class="btn btn--primary" :disabled="!meta?.profiles.length" @click="edit(null)">
        <q-icon name="add" size="18px" />پیشنهاد جدید
      </button>
    </div>
    <p class="muted-text" style="margin-top: -6px">
      مزیت خود را با خدمت نشان دهید: هر پیشنهاد باید دست‌کم یک خدمت ارزش‌افزوده داشته باشد. اعلام
      تخفیف قیمتی فقط برای شرکت بیمه و با ذکر بخشنامه یا مجوز ممکن است. پیشنهادها پیش از انتشار
      بررسی می‌شوند.
    </p>

    <div v-if="error" class="notice notice--error">{{ error }}</div>
    <div v-if="!items" class="skeleton" style="height: 240px" />
    <div v-else-if="!meta?.profiles.length" class="state">
      <q-icon name="badge" />برای ثبت پیشنهاد ابتدا پروفایل خود را مطالبه کنید.
    </div>
    <div v-else-if="!items.length" class="state">
      <q-icon name="campaign" />هنوز پیشنهادی ثبت نکرده‌اید.
    </div>
    <div v-else class="card compare-scroll" style="padding: 0">
      <table class="compare data-table">
        <thead>
          <tr>
            <th scope="col">عنوان</th>
            <th scope="col">بازه</th>
            <th scope="col">وضعیت</th>
            <th scope="col">بازدید</th>
            <th scope="col"><span class="sr-only">اقدام</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="offer in items" :key="offer.id">
            <td>
              {{ offer.title }}
              <small class="muted-text" style="display: block">{{ offer.provider?.name }}</small>
            </td>
            <td>{{ faDate(offer.starts_on) }} تا {{ faDate(offer.ends_on) }}</td>
            <td>
              <StatusBadge :status="moderationStatuses[offer.status ?? 'draft']" />
              <small v-if="offer.review_note" class="muted-text" style="display: block">
                {{ offer.review_note }}
              </small>
            </td>
            <td>{{ faNumber(offer.views ?? 0) }}</td>
            <td>
              <div class="stack-row">
                <router-link
                  v-if="offer.status === 'published'"
                  :to="`/offers/${offer.id}`"
                  class="btn btn--ghost"
                  >مشاهده</router-link
                >
                <button
                  v-if="['draft', 'rejected', 'withdrawn'].includes(offer.status ?? '')"
                  class="btn btn--ghost"
                  @click="edit(offer)"
                >
                  ویرایش
                </button>
                <button
                  v-if="['draft', 'rejected', 'withdrawn'].includes(offer.status ?? '')"
                  class="btn btn--outline"
                  @click="act(offer, 'submit')"
                >
                  ارسال برای بررسی
                </button>
                <button
                  v-if="['pending', 'published'].includes(offer.status ?? '')"
                  class="btn btn--ghost"
                  @click="act(offer, 'withdraw')"
                >
                  پس گرفتن
                </button>
                <button
                  v-if="['draft', 'rejected', 'withdrawn'].includes(offer.status ?? '')"
                  class="btn btn--ghost"
                  aria-label="حذف"
                  @click="act(offer, 'delete')"
                >
                  <q-icon name="delete" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <q-dialog v-model="open">
      <form class="dialog-card" style="max-width: 680px" @submit.prevent="save(true)">
        <h2>{{ editingId ? 'ویرایش پیشنهاد' : 'پیشنهاد جدید' }}</h2>
        <label v-if="!editingId && (meta?.profiles.length ?? 0) > 1" class="field-label">
          پروفایل
          <select v-model="profile" class="select">
            <option v-for="item in meta?.profiles" :key="item.slug" :value="item.slug">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label v-if="canDiscount" class="field-label">
          نوع
          <select v-model="draft.kind" class="select">
            <option v-for="(label, key) in meta?.kinds" :key="key" :value="key">{{ label }}</option>
          </select>
        </label>
        <label class="field-label">
          عنوان<input v-model="draft.title" class="input" required minlength="5" maxlength="120" />
        </label>
        <label class="field-label">
          شرح و شرایط
          <textarea
            v-model="draft.body"
            class="textarea"
            required
            minlength="20"
            maxlength="3000"
          />
        </label>
        <fieldset class="field-label" style="border: 0; padding: 0">
          <legend>رشته‌ها</legend>
          <div class="chips">
            <button
              v-for="line in directory.taxonomy?.insurance_lines ?? []"
              :key="line"
              type="button"
              class="chip"
              :class="{ 'chip--on': draft.insurance_lines.includes(line) }"
              :aria-pressed="draft.insurance_lines.includes(line)"
              @click="toggle(draft.insurance_lines, line)"
            >
              {{ line }}
            </button>
          </div>
        </fieldset>
        <fieldset class="field-label" style="border: 0; padding: 0">
          <legend>خدمات ارزش‌افزوده{{ canDiscount ? ' (اختیاری)' : '' }}</legend>
          <div class="chips">
            <button
              v-for="service in meta?.services ?? []"
              :key="service"
              type="button"
              class="chip"
              :class="{ 'chip--on': draft.services.includes(service) }"
              :aria-pressed="draft.services.includes(service)"
              @click="toggle(draft.services, service)"
            >
              {{ service }}
            </button>
          </div>
        </fieldset>
        <div v-if="canDiscount" class="form-row">
          <label class="field-label">
            تخفیف (اختیاری)
            <input
              v-model="draft.discount_text"
              class="input"
              maxlength="120"
              placeholder="مثلاً: ۱۰٪ تخفیف بدنه"
            />
          </label>
          <label class="field-label">
            مستند مجوز تخفیف
            <input
              v-model="draft.regulatory_reference"
              class="input"
              maxlength="255"
              placeholder="شماره بخشنامه یا مجوز"
            />
          </label>
        </div>
        <div class="form-row">
          <label class="field-label"
            >شروع<JalaliDateInput v-model="draft.starts_on" :min="localIsoDate()" required
          /></label>
          <label class="field-label"
            >پایان<JalaliDateInput v-model="draft.ends_on" required
          /></label>
        </div>
        <label class="field-label">
          استان‌ها (خالی = سراسر کشور)
          <select v-model="draft.provinces" class="select" multiple size="4">
            <option v-for="item in directory.taxonomy?.provinces ?? []" :key="item">
              {{ item }}
            </option>
          </select>
        </label>
        <div v-if="formError" class="notice notice--error">{{ formError }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="open = false">انصراف</button>
          <button type="button" class="btn btn--outline" :disabled="busy" @click="save(false)">
            ذخیرهٔ پیش‌نویس
          </button>
          <button class="btn btn--primary" :disabled="busy">ارسال برای بررسی</button>
        </div>
      </form>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
