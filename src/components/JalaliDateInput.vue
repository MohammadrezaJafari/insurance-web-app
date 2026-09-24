<script setup lang="ts">
import { computed, ref } from 'vue';
import { isoToJalali, jalaliToIso, localIsoDate } from '../jalali';
import { faDate } from '../format';

/** Persian-calendar date picker; the model stays a Gregorian ISO date for the API. */
const model = defineModel<string | null>({ required: true });
const props = withDefaults(
  defineProps<{ min?: string | undefined; required?: boolean; label?: string }>(),
  {
    min: undefined,
    required: false,
    label: 'انتخاب تاریخ',
  },
);
const open = ref(false);
const jalali = computed({
  get: () => (model.value ? isoToJalali(model.value) : null),
  set: (value: string | null) => {
    model.value = value ? jalaliToIso(value) : null;
    open.value = false;
  },
});
const minJalali = computed(() =>
  props.min ? isoToJalali(props.min === 'today' ? localIsoDate() : props.min) : null,
);
const allowed = (date: string) => !minJalali.value || date >= minJalali.value;
</script>

<template>
  <div class="date-field">
    <button type="button" class="input date-field__button" :aria-label="label" @click="open = true">
      <q-icon name="event" size="18px" />
      <span :class="{ placeholder: !model }">{{ model ? faDate(model) : 'انتخاب تاریخ' }}</span>
      <q-icon
        v-if="model && !required"
        name="close"
        size="16px"
        class="date-field__clear"
        @click.stop="model = null"
      />
    </button>
    <input
      v-if="required"
      class="date-field__proxy"
      :value="model ?? ''"
      required
      tabindex="-1"
      aria-hidden="true"
    />
    <q-dialog v-model="open">
      <q-date
        v-model="jalali"
        calendar="persian"
        mask="YYYY/MM/DD"
        :options="allowed"
        minimal
        color="primary"
      />
    </q-dialog>
  </div>
</template>
