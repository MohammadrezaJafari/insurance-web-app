<script setup lang="ts">
import { faNumber } from '../format';

/** Read-only stars, or an input when a v-model is bound. */
const props = withDefaults(
  defineProps<{ value?: number | null; label?: string; input?: boolean }>(),
  {
    value: null,
    label: '',
    input: false,
  },
);
const model = defineModel<number>({ default: 0 });
const shown = () => (props.input ? model.value : (props.value ?? 0));
</script>

<template>
  <span
    class="stars"
    :role="input ? 'radiogroup' : 'img'"
    :aria-label="input ? label : `${label} ${faNumber(value ?? 0)} از ۵`"
  >
    <template v-if="input">
      <button
        v-for="star in 5"
        :key="star"
        type="button"
        role="radio"
        :aria-checked="model === star"
        :aria-label="`${faNumber(star)} ستاره`"
        @click="model = star"
      >
        <q-icon :name="star <= shown() ? 'star' : 'star_border'" />
      </button>
    </template>
    <template v-else>
      <q-icon
        v-for="star in 5"
        :key="star"
        :name="star <= Math.round(shown()) ? 'star' : 'star_border'"
      />
    </template>
  </span>
</template>
