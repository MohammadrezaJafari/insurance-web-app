<script setup lang="ts">
import { onMounted } from 'vue';
import { useDirectoryStore } from '../stores/directory';
import type { IncentiveDraft } from '../types';
import JalaliDateInput from './JalaliDateInput.vue';

const model = defineModel<IncentiveDraft>({ required: true });
const directory = useDirectoryStore();

function toggleLine(line: string): void {
  const lines = model.value.insurance_lines;
  model.value.insurance_lines = lines.includes(line)
    ? lines.filter((item) => item !== line)
    : [...lines, line];
}
onMounted(() => directory.loadTaxonomy().catch(() => undefined));
</script>

<template>
  <label class="field-label">
    عنوان<input v-model="model.title" class="input" required minlength="5" maxlength="255" />
  </label>
  <label class="field-label">
    شرح و شرایط<textarea v-model="model.description" class="textarea" maxlength="3000" />
  </label>
  <div class="form-row">
    <label class="field-label">
      شاخص
      <select v-model="model.metric" class="select">
        <option value="premium">مجموع حق بیمه</option>
        <option value="policies">تعداد بیمه‌نامه</option>
      </select>
    </label>
    <span />
    <label class="field-label">شروع<JalaliDateInput v-model="model.starts_on" required /></label>
    <label class="field-label">پایان<JalaliDateInput v-model="model.ends_on" required /></label>
  </div>
  <fieldset class="field-label" style="border: 0; padding: 0">
    <legend>رشته‌ها (خالی = همه)</legend>
    <div class="chips">
      <button
        v-for="line in directory.taxonomy?.insurance_lines ?? []"
        :key="line"
        type="button"
        class="chip"
        :class="{ 'chip--on': model.insurance_lines.includes(line) }"
        :aria-pressed="model.insurance_lines.includes(line)"
        @click="toggleLine(line)"
      >
        {{ line }}
      </button>
    </div>
  </fieldset>
  <fieldset class="field-label" style="border: 0; padding: 0">
    <legend>پله‌های پاداش</legend>
    <div
      v-for="(tier, index) in model.tiers"
      :key="index"
      class="form-row"
      style="align-items: end"
    >
      <label class="field-label">
        آستانه ({{ model.metric === 'premium' ? 'ریال' : 'تعداد' }})
        <input
          v-model.number="tier.threshold"
          class="input"
          type="number"
          min="1"
          dir="ltr"
          required
        />
      </label>
      <label class="field-label">
        پاداش<input v-model="tier.reward" class="input" required maxlength="255" />
      </label>
      <button
        v-if="model.tiers.length > 1"
        type="button"
        class="btn btn--ghost"
        aria-label="حذف پله"
        @click="model.tiers.splice(index, 1)"
      >
        <q-icon name="close" />
      </button>
    </div>
    <button
      v-if="model.tiers.length < 6"
      type="button"
      class="btn btn--outline"
      @click="model.tiers.push({ threshold: 0, reward: '' })"
    >
      <q-icon name="add" />پلهٔ دیگر
    </button>
  </fieldset>
</template>
