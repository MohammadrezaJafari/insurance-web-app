<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { fileComplaint } from '../api';
import { useAuthStore } from '../stores/auth';
import { errorMessage } from '../format';

const props = defineProps<{ slug: string; name: string; categories: string[] }>();
const open = defineModel<boolean>({ default: false });
const auth = useAuthStore();
const router = useRouter();
const category = ref('');
const body = ref('');
const reference = ref('');
const busy = ref(false);
const error = ref('');
const done = ref(false);

watch(open, (value) => {
  if (!value) return;
  category.value = '';
  body.value = '';
  reference.value = '';
  error.value = '';
  done.value = false;
});

async function submit(): Promise<void> {
  if (!auth.loggedIn) {
    await router.push({
      path: '/account',
      query: { redirect: router.currentRoute.value.fullPath },
    });
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await fileComplaint(props.slug, {
      category: category.value,
      body: body.value,
      request_reference: reference.value.trim() || null,
    });
    done.value = true;
  } catch (exception) {
    error.value = errorMessage(exception, 'ثبت شکایت ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <q-dialog v-model="open">
    <form class="dialog-card" @submit.prevent="submit">
      <h2>ثبت شکایت از {{ name }}</h2>
      <template v-if="done">
        <p>شکایت ثبت شد. نتیجهٔ بررسی از طریق اعلان‌ها به شما اطلاع داده می‌شود.</p>
        <div class="dialog-actions">
          <button type="button" class="btn btn--primary" @click="open = false">بستن</button>
        </div>
      </template>
      <template v-else>
        <p>
          شکایت پس از بررسی اپراتور و شنیدن روایت ارائه‌دهنده رسیدگی می‌شود. اینشورهاب جایگزین مرجع
          رسیدگی قانونی (بیمهٔ مرکزی) نیست.
        </p>
        <p v-if="!auth.loggedIn" class="notice notice--info">برای ثبت شکایت ابتدا وارد شوید.</p>
        <label class="field-label">
          موضوع
          <select v-model="category" class="select" required>
            <option value="" disabled>انتخاب کنید</option>
            <option v-for="item in categories" :key="item">{{ item }}</option>
          </select>
        </label>
        <label class="field-label">
          شرح ماجرا
          <textarea v-model="body" class="textarea" required minlength="30" maxlength="3000" />
        </label>
        <label class="field-label">
          کد درخواست مرتبط در اینشورهاب (اختیاری)
          <input v-model="reference" class="input" dir="ltr" />
        </label>
        <div v-if="error" class="notice notice--error">{{ error }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="open = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">
            {{ auth.loggedIn ? 'ثبت شکایت' : 'ورود و ثبت' }}
          </button>
        </div>
      </template>
    </form>
  </q-dialog>
</template>
