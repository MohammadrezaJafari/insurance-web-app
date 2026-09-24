<script setup lang="ts">
import { computed, ref } from 'vue';
import { ApiError, reportError } from '../api';
import type { Option } from '../types';

const props = defineProps<{ slug: string; fields: Option[]; relations: Option[] }>();
const open = defineModel<boolean>({ required: true });
const kind = ref<'correction' | 'removal'>('correction');
const field = ref('');
const relation = ref('');
const message = ref('');
const contact = ref('');
const busy = ref(false);
const done = ref('');
const error = ref('');
const removal = computed(() => kind.value === 'removal');

async function submit(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    const result = await reportError(props.slug, {
      kind: kind.value,
      field: removal.value ? undefined : field.value,
      relation: removal.value ? relation.value : undefined,
      message: message.value,
      contact: contact.value || undefined,
    });
    done.value = result.message;
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'ارسال درخواست ممکن نشد.';
  } finally {
    busy.value = false;
  }
}
function close(): void {
  open.value = false;
  if (done.value) {
    done.value = '';
    kind.value = 'correction';
    message.value = '';
    field.value = '';
    relation.value = '';
    contact.value = '';
  }
}
</script>

<template>
  <q-dialog v-model="open" @hide="close">
    <div class="dialog-card">
      <h2>{{ removal ? 'درخواست حذف پروفایل' : 'گزارش خطا در اطلاعات' }}</h2>
      <div v-if="done" class="notice">{{ done }}</div>
      <form v-else @submit.prevent="submit">
        <div class="segmented" role="group" aria-label="نوع درخواست">
          <button
            type="button"
            :class="{ active: !removal }"
            :aria-pressed="!removal"
            @click="kind = 'correction'"
          >
            اصلاح اطلاعات
          </button>
          <button
            type="button"
            :class="{ active: removal }"
            :aria-pressed="removal"
            @click="kind = 'removal'"
          >
            حذف پروفایل
          </button>
        </div>
        <p v-if="removal">
          پس از بررسی ارتباط شما با این پروفایل، پروفایل از سایت برداشته می‌شود و با به‌روزرسانی
          منابع هم دوباره منتشر نمی‌شود.
        </p>
        <p v-else>
          اپراتور گزارش را با منبع اطلاعات مقایسه می‌کند؛ تغییر بدون بررسی اعمال نمی‌شود.
        </p>

        <label v-if="removal" class="field-label">
          نسبت شما با این پروفایل
          <select v-model="relation" class="select" required>
            <option value="" disabled>انتخاب کنید</option>
            <option v-for="item in relations" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label v-else class="field-label">
          کدام بخش نادرست است؟
          <select v-model="field" class="select" required>
            <option value="" disabled>انتخاب کنید</option>
            <option v-for="item in fields" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>
        <label class="field-label">
          {{ removal ? 'توضیح درخواست' : 'شرح خطا و اطلاعات درست' }}
          <textarea v-model="message" class="textarea" minlength="10" maxlength="2000" required />
        </label>
        <label class="field-label">
          {{ removal ? 'راه تماس برای بررسی ارتباط شما' : 'راه تماس برای پیگیری (اختیاری)' }}
          <input
            v-model="contact"
            class="input"
            maxlength="255"
            autocomplete="email"
            :required="removal"
          />
          <small v-if="removal" class="hint"
            >فقط برای همین درخواست؛ ۱۸۰ روز پس از رسیدگی پاک می‌شود.</small
          >
        </label>
        <div v-if="error" class="notice notice--error">{{ error }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="close">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">
            {{ busy ? 'در حال ارسال…' : removal ? 'ثبت درخواست حذف' : 'ثبت گزارش' }}
          </button>
        </div>
      </form>
      <div v-if="done" class="dialog-actions">
        <button class="btn btn--primary" @click="close">بستن</button>
      </div>
    </div>
  </q-dialog>
</template>
