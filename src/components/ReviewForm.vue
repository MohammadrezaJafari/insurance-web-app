<script setup lang="ts">
import { reactive, ref } from 'vue';
import { reviewRequest } from '../api';
import { errorMessage } from '../format';
import StarRating from './StarRating.vue';

const props = defineProps<{ reference: string; provider: string }>();
const emit = defineEmits<{ sent: [] }>();
const review = reactive({ speed: 0, expertise: 0, service: 0, comment: '' });
const busy = ref(false);
const error = ref('');
const sent = ref(false);
const axes = { speed: 'سرعت پاسخ', expertise: 'تخصص', service: 'خدمات و پیگیری' } as const;

async function submit(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    await reviewRequest(props.reference, { ...review, comment: review.comment.trim() || null });
    sent.value = true;
    emit('sent');
  } catch (exception) {
    error.value = errorMessage(exception, 'ثبت نظر ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="card">
    <h2><q-icon name="rate_review" />نظر شما دربارهٔ {{ provider }}</h2>
    <p v-if="sent" class="notice">سپاس! نظر شما پس از بررسی روی پروفایل منتشر می‌شود.</p>
    <form v-else @submit.prevent="submit">
      <div v-for="(label, axis) in axes" :key="axis" class="kv">
        <b>{{ label }}</b>
        <StarRating v-model="review[axis]" input :label="label" />
      </div>
      <label class="field-label">
        توضیح (اختیاری)
        <textarea v-model="review.comment" class="textarea" maxlength="1500" />
      </label>
      <div v-if="error" class="notice notice--error">{{ error }}</div>
      <button
        class="btn btn--primary btn--block"
        :disabled="busy || !review.speed || !review.expertise || !review.service"
      >
        ثبت نظر
      </button>
    </form>
  </section>
</template>
