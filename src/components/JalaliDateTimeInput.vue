<script setup lang="ts">
import { computed } from 'vue';
import JalaliDateInput from './JalaliDateInput.vue';
import { localIsoDate } from '../jalali';

/** Jalali date plus local time; the model is an ISO timestamp (UTC) for the API. */
const model = defineModel<string | null>({ required: true });
defineProps<{ label?: string; required?: boolean }>();

const pad = (value: number) => String(value).padStart(2, '0');
const date = computed({
  get: () => (model.value ? localIsoDate(new Date(model.value)) : null),
  set: (value: string | null) => {
    model.value = value ? new Date(`${value}T${time.value}`).toISOString() : null;
  },
});
const time = computed({
  get: () => {
    if (!model.value) return '12:00';
    const at = new Date(model.value);
    return `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  },
  set: (value: string) => {
    if (date.value) model.value = new Date(`${date.value}T${value || '12:00'}`).toISOString();
  },
});
</script>

<template>
  <div class="datetime-field">
    <JalaliDateInput
      v-model="date"
      min="today"
      :required="required ?? false"
      :label="label ?? 'تاریخ'"
    />
    <input v-model="time" class="input" type="time" dir="ltr" :aria-label="`ساعت ${label ?? ''}`" />
  </div>
</template>
