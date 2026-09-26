<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import {
  ApiError,
  createRequest,
  deleteAttachment,
  getRequest,
  getRequestMeta,
  submitRequest,
  updateRequest,
  uploadAttachment,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { faMoneyShort, faNumber, fileSize } from '../format';
import type { Attachment, RequestDraft, RequestMeta } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';
import RequestAudience from '../components/RequestAudience.vue';

useMeta({
  title: 'ثبت استعلام بیمه | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const router = useRouter();
const requireAuth = useRequireAuth();
const meta = ref<RequestMeta | null>(null);
const reference = ref(typeof route.params.reference === 'string' ? route.params.reference : '');
const attachments = ref<Attachment[]>([]);
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const fieldErrors = ref<Record<string, string[]>>({});
const form = reactive<RequestDraft>({
  request_type: '',
  title: '',
  province: '',
  city: null,
  coverage_amount: null,
  desired_start_date: null,
  description: null,
  details: {},
  visibility: 'matched',
  provider_slugs: [],
  promotion_id: null,
  source_channel: null,
});
const requestLine = computed(
  () =>
    type.value?.line ??
    (typeof form.details.related_line === 'string' ? form.details.related_line : null),
);

const typeGroups = computed(() => [
  {
    kind: 'insurance',
    title: 'خرید بیمه',
    items: meta.value?.types.filter((item) => item.kind === 'insurance') ?? [],
  },
  {
    kind: 'service',
    title: 'خدمات تخصصی (مشاور ریسک و ارزیاب خسارت)',
    items: meta.value?.types.filter((item) => item.kind === 'service') ?? [],
  },
]);
const type = computed(
  () => meta.value?.types.find((item) => item.key === form.request_type) ?? null,
);
const startLabel = computed(() =>
  type.value?.kind === 'service' ? 'زمان مورد نظر برای شروع کار' : 'تاریخ شروع پوشش',
);

function chooseType(key: string): void {
  form.request_type = key;
  form.details = {};
}
function errorFor(key: string): string | undefined {
  return fieldErrors.value[key]?.[0];
}

async function save(): Promise<boolean> {
  busy.value = true;
  error.value = '';
  fieldErrors.value = {};
  try {
    const saved = reference.value
      ? await updateRequest(reference.value, form)
      : await createRequest(form);
    if (!reference.value) {
      reference.value = saved.reference;
      await router.replace(`/requests/${saved.reference}/edit`);
    }
    return true;
  } catch (exception) {
    if (exception instanceof ApiError) {
      fieldErrors.value = exception.errors;
      error.value = Object.keys(exception.errors).length
        ? 'برخی فیلدها نیاز به اصلاح دارند.'
        : exception.message;
    } else {
      error.value = 'ذخیره ممکن نشد.';
    }
    return false;
  } finally {
    busy.value = false;
  }
}

async function saveAndSubmit(): Promise<void> {
  if (!(await save())) return;
  busy.value = true;
  try {
    await submitRequest(reference.value);
    await router.push(`/requests/${reference.value}`);
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'ارسال ممکن نشد.';
  } finally {
    busy.value = false;
  }
}

async function upload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (!reference.value && !(await save())) return;
  busy.value = true;
  error.value = '';
  try {
    attachments.value.push(await uploadAttachment(reference.value, file));
  } catch (exception) {
    error.value =
      exception instanceof ApiError
        ? (Object.values(exception.errors)[0]?.[0] ?? exception.message)
        : 'بارگذاری ممکن نشد.';
  } finally {
    busy.value = false;
  }
}

async function removeAttachment(id: number): Promise<void> {
  await deleteAttachment(reference.value, id);
  attachments.value = attachments.value.filter((item) => item.id !== id);
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    meta.value = await getRequestMeta();
    if (reference.value) {
      const existing = await getRequest(reference.value);
      if (existing.status !== 'draft') {
        await router.replace(`/requests/${existing.reference}`);
        return;
      }
      Object.assign(form, {
        request_type: existing.request_type,
        title: existing.title,
        province: existing.province,
        city: existing.city,
        coverage_amount: existing.coverage_amount,
        desired_start_date: existing.desired_start_date,
        description: existing.description,
        details: { ...existing.details },
      });
      attachments.value = existing.attachments;
      form.visibility = existing.visibility ?? 'matched';
      form.provider_slugs = existing.requested_providers.map((provider) => provider.slug);
    } else {
      if (typeof route.query.type === 'string') chooseType(route.query.type);
      // Direct inquiry from a profile or an offer: invite that provider.
      if (typeof route.query.provider === 'string') {
        form.visibility = 'invited';
        form.provider_slugs = [route.query.provider];
      }
      if (typeof route.query.offer === 'string') form.promotion_id = Number(route.query.offer);
      if (typeof route.query.line === 'string' && !form.request_type) {
        const byLine = meta.value.types.find((item) => item.line === route.query.line);
        if (byLine) chooseType(byLine.key);
      }
      try {
        form.source_channel = sessionStorage.getItem('insurehub_ref');
      } catch {
        form.source_channel = null;
      }
    }
  } catch {
    error.value = 'دریافت اطلاعات فرم ممکن نشد.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/requests">استعلام‌های من</router-link>
      <q-icon name="chevron_left" />
      <span>{{ reference ? 'ویرایش پیش‌نویس' : 'استعلام جدید' }}</span>
    </nav>
    <header class="flow-head">
      <div class="eyebrow">استعلام بیمه</div>
      <h1>نیاز بیمه‌ای خود را ثبت کنید</h1>
      <p>
        پس از بررسی اپراتور، درخواست فقط به حداکثر
        {{ faNumber(meta?.max_providers ?? 5) }} ارائه‌دهندهٔ دارای مجوز بررسی‌شده در همان رشته و
        منطقه می‌رسد؛ خودتان تعیین می‌کنید با انتخاب سیستم، با دعوت خودتان یا در بازار عمومی.
        اطلاعات تماس شما تا زمان انتخاب پیشنهاد نمایش داده نمی‌شود.
      </p>
    </header>

    <div v-if="loading" class="skeleton" style="height: 320px" />
    <form v-else-if="meta" class="flow-grid" @submit.prevent="saveAndSubmit">
      <div>
        <section class="card">
          <h2><span class="step-no">۱</span>نوع درخواست</h2>
          <template v-for="group in typeGroups" :key="group.kind">
            <h3 v-if="group.items.length" class="type-group">{{ group.title }}</h3>
            <div class="type-choice" role="radiogroup" :aria-label="group.title">
              <button
                v-for="item in group.items"
                :key="item.key"
                type="button"
                role="radio"
                :aria-checked="form.request_type === item.key"
                :class="{ active: form.request_type === item.key }"
                :disabled="!!reference"
                @click="chooseType(item.key)"
              >
                <b>{{ item.label }}</b>
                <span>{{ item.description }}</span>
              </button>
            </div>
          </template>
          <p v-if="errorFor('request_type')" class="field-error">{{ errorFor('request_type') }}</p>
        </section>

        <section v-if="type" class="card">
          <h2><span class="step-no">۲</span>مشخصات {{ type.label }}</h2>
          <label class="field-label">
            عنوان درخواست
            <input
              v-model="form.title"
              class="input"
              required
              minlength="5"
              maxlength="255"
              placeholder="مثلاً: بیمه مسئولیت کارفرما برای کارگاه تولیدی"
            />
            <span v-if="errorFor('title')" class="field-error">{{ errorFor('title') }}</span>
          </label>
          <div class="form-row">
            <label
              v-for="field in type.fields"
              :key="field.key"
              class="field-label"
              :class="{ 'span-2': field.type === 'textarea' }"
            >
              {{ field.label }}<span v-if="field.required" class="req">*</span>
              <select
                v-if="field.type === 'select'"
                v-model="form.details[field.key]"
                class="select"
                :required="field.required"
              >
                <option :value="undefined" disabled>انتخاب کنید</option>
                <option v-for="option in field.options" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
              <textarea
                v-else-if="field.type === 'textarea'"
                v-model="form.details[field.key]"
                class="textarea"
                maxlength="2000"
              />
              <JalaliDateInput
                v-else-if="field.type === 'date'"
                :model-value="(form.details[field.key] as string | null) ?? null"
                :required="field.required"
                :label="field.label"
                @update:model-value="form.details[field.key] = $event"
              />
              <select
                v-else-if="field.type === 'line'"
                v-model="form.details[field.key]"
                class="select"
                :required="field.required"
              >
                <option :value="undefined" disabled>انتخاب کنید</option>
                <option v-for="line in meta.insurance_lines" :key="line">{{ line }}</option>
              </select>
              <input
                v-else-if="field.type === 'number'"
                v-model.number="form.details[field.key]"
                class="input"
                type="number"
                min="0"
                dir="ltr"
                :required="field.required"
              />
              <input
                v-else
                v-model="form.details[field.key]"
                class="input"
                maxlength="255"
                :required="field.required"
              />
              <span v-if="errorFor(`details.${field.key}`)" class="field-error">{{
                errorFor(`details.${field.key}`)
              }}</span>
            </label>
          </div>
          <label class="field-label">
            توضیحات تکمیلی
            <textarea
              v-model="form.description"
              class="textarea"
              maxlength="5000"
              placeholder="هر نکته‌ای که به ارائهٔ پیشنهاد دقیق‌تر کمک می‌کند."
            />
          </label>
        </section>

        <RequestAudience
          v-if="type"
          v-model:visibility="form.visibility!"
          v-model:providers="form.provider_slugs!"
          :request-type="form.request_type"
          :province="form.province"
          :line="requestLine"
          :max-providers="meta.max_providers"
        />
        <div v-if="errorFor('provider_slugs')" class="notice notice--error">
          {{ errorFor('provider_slugs') }}
        </div>

        <section v-if="type" class="card">
          <h2><span class="step-no">۴</span>مدارک (اختیاری)</h2>
          <p class="muted-text">
            فایل‌ها خصوصی‌اند و فقط برای ارائه‌دهنده‌ای که دعوت را بپذیرد قابل مشاهده‌اند. هر دسترسی
            ثبت می‌شود.
          </p>
          <ul v-if="attachments.length" class="file-list">
            <li v-for="file in attachments" :key="file.id">
              <q-icon name="description" />
              <span>{{ file.name }}</span>
              <small>{{ fileSize(file.size) }}</small>
              <button
                type="button"
                class="btn btn--ghost"
                :aria-label="`حذف ${file.name}`"
                @click="removeAttachment(file.id)"
              >
                <q-icon name="delete_outline" />
              </button>
            </li>
          </ul>
          <label class="btn btn--outline file-picker">
            <q-icon name="upload_file" size="18px" />افزودن مدرک
            <input
              type="file"
              :accept="meta.attachment.mimes.map((mime) => `.${mime}`).join(',')"
              :disabled="busy"
              @change="upload"
            />
          </label>
          <small class="muted-text">
            {{ meta.attachment.mimes.join('، ').toUpperCase() }} · حداکثر
            {{ fileSize(meta.attachment.max_kb * 1024) }}
          </small>
        </section>
      </div>

      <aside v-if="type">
        <section class="card sticky-card">
          <h2>
            <span class="step-no">۵</span
            >{{ type.kind === 'service' ? 'محل و زمان' : 'محل و تعهد' }}
          </h2>
          <label class="field-label">
            استان<span class="req">*</span>
            <select v-model="form.province" class="select" required>
              <option value="" disabled>انتخاب کنید</option>
              <option v-for="province in meta.provinces" :key="province">{{ province }}</option>
            </select>
          </label>
          <label class="field-label">
            شهر
            <input v-model="form.city" class="input" maxlength="64" />
          </label>
          <label v-if="type.kind === 'insurance'" class="field-label">
            سقف تعهد مورد نیاز (ریال)
            <input
              v-model.number="form.coverage_amount"
              class="input"
              type="number"
              min="0"
              dir="ltr"
            />
            <small v-if="form.coverage_amount" class="hint">{{
              faMoneyShort(form.coverage_amount)
            }}</small>
          </label>
          <label class="field-label">
            {{ startLabel }}
            <JalaliDateInput v-model="form.desired_start_date" min="today" :label="startLabel" />
          </label>
          <div v-if="error" class="notice notice--error">{{ error }}</div>
          <div class="stack">
            <button type="submit" class="btn btn--primary btn--block" :disabled="busy">
              <q-icon name="send" class="flip" size="18px" />ارسال برای بررسی
            </button>
            <button
              type="button"
              class="btn btn--outline btn--block"
              :disabled="busy"
              @click="save"
            >
              ذخیره پیش‌نویس
            </button>
          </div>
        </section>
      </aside>
    </form>
    <div v-else class="state state--error">{{ error }}</div>
  </main>
  <SiteFooter />
</template>
