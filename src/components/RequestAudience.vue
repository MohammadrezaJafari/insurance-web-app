<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { eligibleProviders } from '../api';
import { actorTypes, faNumber } from '../format';
import type { EligibleProvider, RequestVisibility } from '../types';

/**
 * Who sees the request: providers matched by rules, providers the buyer picks, or the open market.
 * The same qualification rules (line, verified license, area, capacity) apply in every mode.
 */
const props = defineProps<{
  requestType: string;
  province: string;
  line: string | null;
  maxProviders: number;
}>();
const visibility = defineModel<RequestVisibility>('visibility', { required: true });
const selected = defineModel<string[]>('providers', { required: true });

const eligible = ref<EligibleProvider[]>([]);
const notQualified = ref<string[]>([]);
const loading = ref(false);
const ready = computed(() => Boolean(props.requestType && props.province && props.line));

const options: { key: RequestVisibility; title: string; text: string; icon: string }[] = [
  {
    key: 'matched',
    title: 'انتخاب با اینشورهاب',
    text: 'سیستم با قواعد شفاف مناسب‌ترین ارائه‌دهندگان را انتخاب می‌کند.',
    icon: 'auto_awesome',
  },
  {
    key: 'invited',
    title: 'خودم انتخاب می‌کنم',
    text: 'از میان ارائه‌دهندگان واجد شرایط، کسانی را که می‌خواهید دعوت کنید.',
    icon: 'how_to_reg',
  },
  {
    key: 'public',
    title: 'بازار عمومی',
    text: 'همهٔ واجدان شرایط درخواست را (بدون هویت شما) می‌بینند و تا سقف تعداد، اول‌آمدگان پیشنهاد می‌دهند.',
    icon: 'storefront',
  },
];

async function load(): Promise<void> {
  if (!ready.value) return;
  loading.value = true;
  try {
    const result = await eligibleProviders(
      props.requestType,
      props.province,
      props.line,
      selected.value,
    );
    eligible.value = result.data;
    notQualified.value = result.not_qualified;
    // Keep the notice, but drop choices that cannot receive this request.
    selected.value = selected.value.filter((slug) => !result.not_qualified.includes(slug));
  } catch {
    eligible.value = [];
  } finally {
    loading.value = false;
  }
}
function toggle(slug: string): void {
  if (selected.value.includes(slug)) {
    selected.value = selected.value.filter((item) => item !== slug);
  } else if (selected.value.length < props.maxProviders) {
    selected.value = [...selected.value, slug];
  }
}

watch(
  () => [props.requestType, props.province, props.line, visibility.value],
  () => {
    if (visibility.value === 'invited') void load();
  },
  { immediate: true },
);
</script>

<template>
  <section class="card">
    <h2><span class="step-no">۳</span>چه کسانی درخواست را ببینند؟</h2>
    <div class="type-choice" role="radiogroup" aria-label="نحوهٔ نمایش درخواست">
      <button
        v-for="option in options"
        :key="option.key"
        type="button"
        role="radio"
        :aria-checked="visibility === option.key"
        :class="{ active: visibility === option.key }"
        @click="visibility = option.key"
      >
        <q-icon :name="option.icon" size="22px" />
        <b>{{ option.title }}</b>
        <span>{{ option.text }}</span>
      </button>
    </div>

    <template v-if="visibility === 'invited'">
      <p v-if="!ready" class="muted-text">برای دیدن فهرست، نوع درخواست و استان را انتخاب کنید.</p>
      <div v-else-if="loading" class="skeleton" style="height: 120px" />
      <template v-else>
        <p class="muted-text">
          تا {{ faNumber(maxProviders) }} ارائه‌دهنده انتخاب کنید ({{ faNumber(selected.length) }}
          انتخاب‌شده).
        </p>
        <p v-if="notQualified.length" class="notice notice--error">
          ارائه‌دهندهٔ انتخاب‌شده شرایط این درخواست (رشته، منطقه، مجوز معتبر یا ظرفیت) را ندارد؛
          دیگری را انتخاب کنید یا «انتخاب با اینشورهاب» را بزنید.
        </p>
        <p v-if="!eligible.length" class="muted-text">ارائه‌دهندهٔ واجد شرایطی پیدا نشد.</p>
        <label v-for="provider in eligible" :key="provider.slug" class="check provider-pick">
          <input
            type="checkbox"
            :checked="selected.includes(provider.slug)"
            :disabled="!selected.includes(provider.slug) && selected.length >= maxProviders"
            @change="toggle(provider.slug)"
          />
          <span>
            <b>{{ provider.name }}</b>
            <small class="muted-text">
              {{ actorTypes[provider.type].label }}
              <template v-if="provider.province"> · {{ provider.province }}</template>
              · {{ provider.reasons.slice(0, 2).join('، ') }}
            </small>
          </span>
          <router-link :to="`/profiles/${provider.slug}`" target="_blank" class="link"
            >پروفایل</router-link
          >
        </label>
      </template>
    </template>
  </section>
</template>
