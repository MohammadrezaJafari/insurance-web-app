<script setup lang="ts">
import { computed } from 'vue';
import { faDate, faMetric, faNumber } from '../format';
import type { IncentiveProgram } from '../types';

const props = defineProps<{ program: IncentiveProgram }>();
const progress = computed(() => props.program.progress!);
const top = computed(() => props.program.tiers.at(-1)?.threshold ?? 1);
const percent = computed(() => Math.min(100, (progress.value.confirmed / top.value) * 100));
const withPending = computed(() =>
  Math.min(100, ((progress.value.confirmed + progress.value.pending) / top.value) * 100),
);
</script>

<template>
  <article class="card incentive">
    <header class="incentive__head">
      <div>
        <b>{{ program.title }}</b>
        <small class="muted-text">
          {{ program.insurer?.name }} · {{ faDate(program.starts_on) }} تا
          {{ faDate(program.ends_on) }}
          <template v-if="program.insurance_lines.length">
            · {{ program.insurance_lines.join('، ') }}</template
          >
        </small>
      </div>
      <span v-if="progress.rank" class="badge badge--brand">
        رتبهٔ {{ faNumber(progress.rank) }} از {{ faNumber(progress.participants) }}
      </span>
    </header>
    <p v-if="program.description" class="pre">{{ program.description }}</p>
    <div class="incentive__meter" role="img" :aria-label="`پیشرفت ${Math.round(percent)} درصد`">
      <span class="incentive__pending" :style="{ width: `${withPending}%` }" />
      <span class="incentive__done" :style="{ width: `${percent}%` }" />
      <i
        v-for="tier in program.tiers"
        :key="tier.threshold"
        :style="{ insetInlineStart: `${(tier.threshold / top) * 100}%` }"
      />
    </div>
    <div class="kv" style="border: 0">
      <b>تأییدشده</b><span>{{ faMetric(program.metric, progress.confirmed) }}</span>
    </div>
    <div v-if="progress.pending" class="kv" style="border: 0">
      <b>در انتظار تأیید</b><span>{{ faMetric(program.metric, progress.pending) }}</span>
    </div>
    <ol class="tiers">
      <li
        v-for="tier in program.tiers"
        :key="tier.threshold"
        :class="{ reached: progress.confirmed >= tier.threshold }"
      >
        <q-icon :name="progress.confirmed >= tier.threshold ? 'task_alt' : 'flag'" />
        {{ faMetric(program.metric, tier.threshold) }}: {{ tier.reward }}
      </li>
    </ol>
    <p v-if="progress.next_tier" class="card__note">
      تا پلهٔ بعد:
      {{ faMetric(program.metric, progress.next_tier.threshold - progress.confirmed) }}
    </p>
  </article>
</template>
