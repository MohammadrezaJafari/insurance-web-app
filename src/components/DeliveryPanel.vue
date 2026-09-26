<script setup lang="ts">
import { ref } from 'vue';
import {
  acceptDelivery,
  deliverReport,
  openDeliverable,
  reviseDelivery,
  scheduleVisit,
} from '../api';
import { errorMessage, faDateTime, fileSize } from '../format';
import type { ServiceDeliveryState } from '../types';
import JalaliDateTimeInput from './JalaliDateTimeInput.vue';

/** Delivery of an expert service, from the buyer's or the chosen provider's side. */
const props = defineProps<{
  delivery: ServiceDeliveryState;
  reference: string;
  role: 'buyer' | 'provider';
  invitationId?: number;
}>();
const emit = defineEmits<{ changed: [] }>();
const busy = ref(false);
const error = ref('');
const visitAt = ref<string | null>(null);
const file = ref<File | null>(null);
const note = ref('');
const revision = ref('');
const steps = [
  { key: 'scheduled', label: 'تعیین زمان بازدید' },
  { key: 'delivered', label: 'تحویل گزارش' },
  { key: 'accepted', label: 'پذیرش سفارش‌دهنده' },
];

function reached(step: string): boolean {
  const order = ['scheduled', 'delivered', 'revision', 'accepted'];
  const current = order.indexOf(props.delivery.status ?? '');
  return (
    current >= order.indexOf(step) ||
    (step === 'delivered' && props.delivery.deliverables.length > 0)
  );
}
async function run(action: () => Promise<unknown>): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    await action();
    emit('changed');
  } catch (exception) {
    error.value = errorMessage(exception);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="card">
    <h2><q-icon name="assignment_turned_in" />تحویل خدمت</h2>
    <ol class="timeline">
      <li v-for="step in steps" :key="step.key" :class="{ done: reached(step.key) }">
        {{ step.label }}
        <small v-if="step.key === 'scheduled' && delivery.visit_at">{{
          faDateTime(delivery.visit_at)
        }}</small>
        <small v-if="step.key === 'delivered' && delivery.delivered_at">{{
          faDateTime(delivery.delivered_at)
        }}</small>
      </li>
    </ol>
    <p v-if="delivery.status === 'revision'" class="notice notice--info">
      درخواست اصلاح: {{ delivery.revision_note }}
    </p>

    <ul v-if="delivery.deliverables.length" class="file-list" style="margin-top: 10px">
      <li v-for="item in delivery.deliverables" :key="item.id">
        <button class="link-button" @click="openDeliverable(reference, item.id)">
          <q-icon name="description" /> نسخهٔ {{ item.version }}: {{ item.name }}
        </button>
        <small>{{ fileSize(item.size) }} · {{ faDateTime(item.created_at) }}</small>
        <small v-if="item.note" class="muted-text" style="display: block">{{ item.note }}</small>
      </li>
    </ul>

    <template v-if="role === 'provider' && invitationId">
      <form
        v-if="!delivery.status || delivery.status === 'scheduled'"
        class="stack"
        style="margin-top: 12px"
        @submit.prevent="run(() => scheduleVisit(invitationId!, visitAt!))"
      >
        <JalaliDateTimeInput v-model="visitAt" label="زمان بازدید" />
        <button class="btn btn--outline" :disabled="busy || !visitAt">
          {{ delivery.visit_at ? 'تغییر زمان بازدید' : 'ثبت زمان بازدید' }}
        </button>
      </form>
      <form
        v-if="delivery.status !== 'delivered' && delivery.status !== 'accepted'"
        class="stack"
        style="margin-top: 12px"
        @submit.prevent="run(() => deliverReport(invitationId!, file!, note || null))"
      >
        <label class="btn btn--outline file-picker">
          <q-icon name="upload_file" size="18px" />{{ file?.name ?? 'انتخاب فایل گزارش' }}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
            @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null"
          />
        </label>
        <textarea
          v-model="note"
          class="textarea"
          maxlength="2000"
          placeholder="توضیح همراه گزارش (اختیاری)"
          aria-label="توضیح"
        />
        <button class="btn btn--primary" :disabled="busy || !file">تحویل گزارش</button>
      </form>
    </template>

    <template v-if="role === 'buyer' && delivery.status === 'delivered'">
      <div class="stack" style="margin-top: 12px">
        <button
          class="btn btn--primary"
          :disabled="busy"
          @click="run(() => acceptDelivery(reference))"
        >
          گزارش را می‌پذیرم و کار بسته شود
        </button>
        <textarea
          v-model="revision"
          class="textarea"
          maxlength="2000"
          placeholder="اگر گزارش کامل نیست، مورد اصلاح را بنویسید"
          aria-label="درخواست اصلاح"
        />
        <button
          class="btn btn--outline"
          :disabled="busy || revision.trim().length < 10"
          @click="run(() => reviseDelivery(reference, revision))"
        >
          درخواست اصلاح
        </button>
      </div>
    </template>
    <div v-if="error" class="notice notice--error">{{ error }}</div>
  </section>
</template>
