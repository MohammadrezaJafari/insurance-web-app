<script setup lang="ts">
import { ref } from 'vue';
import { faDateTime } from '../format';
import type { Message } from '../types';

const props = defineProps<{
  messages: Message[];
  canWrite: boolean;
  send: (body: string) => Promise<Message>;
}>();
const draft = ref('');
const busy = ref(false);
const error = ref('');
const local = ref<Message[]>([...props.messages]);

async function submit(): Promise<void> {
  if (!draft.value.trim()) return;
  busy.value = true;
  error.value = '';
  try {
    local.value.push(await props.send(draft.value.trim()));
    draft.value = '';
  } catch {
    error.value = 'ارسال پیام ممکن نشد.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="thread">
    <p v-if="!local.length" class="muted-text">هنوز پرسش و پاسخی ثبت نشده است.</p>
    <div
      v-for="message in local"
      :key="message.id"
      class="bubble"
      :class="{ 'bubble--mine': message.mine }"
    >
      <small
        >{{ message.author_role === 'buyer' ? 'درخواست‌کننده' : 'ارائه‌دهنده' }} ·
        {{ faDateTime(message.created_at) }}</small
      >
      {{ message.body }}
    </div>
    <form v-if="canWrite" class="thread__form" @submit.prevent="submit">
      <input
        v-model="draft"
        class="input"
        maxlength="2000"
        placeholder="پرسش یا پاسخ خود را بنویسید…"
        aria-label="متن پیام"
      />
      <button class="btn btn--primary" :disabled="busy || !draft.trim()" aria-label="ارسال پیام">
        <q-icon name="send" class="flip" />
      </button>
    </form>
    <div v-if="error" class="notice notice--error">{{ error }}</div>
  </div>
</template>
