<script setup lang="ts">
import { ref, watch } from 'vue';
import { errorMessage, faNumber } from '../format';
import type { ImportResult, ProfileRef } from '../types';

/** Upload a CSV into one of the user's profiles and report per-row errors. */
const props = defineProps<{
  title: string;
  profiles: ProfileRef[];
  upload: (actorSlug: string, file: File) => Promise<ImportResult>;
}>();
const emit = defineEmits<{ imported: [] }>();
const open = defineModel<boolean>({ default: false });

const profile = ref('');
const file = ref<File | null>(null);
const busy = ref(false);
const error = ref('');
const result = ref<ImportResult | null>(null);

watch(open, (value) => {
  if (!value) return;
  profile.value = props.profiles[0]?.slug ?? '';
  file.value = null;
  result.value = null;
  error.value = '';
});

async function run(): Promise<void> {
  if (!file.value) return;
  busy.value = true;
  error.value = '';
  try {
    result.value = await props.upload(profile.value, file.value);
    emit('imported');
  } catch (exception) {
    error.value = errorMessage(exception, 'ورود فایل ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <q-dialog v-model="open">
    <form class="dialog-card" @submit.prevent="run">
      <h2>{{ title }}</h2>
      <p><slot /></p>
      <label v-if="profiles.length > 1" class="field-label">
        پروفایل
        <select v-model="profile" class="select">
          <option v-for="item in profiles" :key="item.slug" :value="item.slug">
            {{ item.name }}
          </option>
        </select>
      </label>
      <label class="btn btn--outline file-picker">
        <q-icon name="upload_file" size="18px" />{{ file?.name ?? 'انتخاب فایل' }}
        <input
          type="file"
          accept=".csv,text/csv"
          @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null"
        />
      </label>
      <div v-if="result" class="notice" :class="{ 'notice--info': result.errors.length }">
        {{ faNumber(result.created) }} ردیف ثبت شد.
        <ul v-if="result.errors.length" style="margin: 6px 0 0; padding-inline-start: 18px">
          <li v-for="item in result.errors.slice(0, 8)" :key="item.row">
            ردیف {{ faNumber(item.row) }}: {{ item.message }}
          </li>
        </ul>
      </div>
      <div v-if="error" class="notice notice--error">{{ error }}</div>
      <div class="dialog-actions">
        <button type="button" class="btn btn--ghost" @click="open = false">بستن</button>
        <button class="btn btn--primary" :disabled="busy || !file">ورود</button>
      </div>
    </form>
  </q-dialog>
</template>
