<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useDirectoryStore } from '../stores/directory';
import type { ClientDraft } from '../types';

/** Shared fields of the new-client dialog and the client edit card. */
const props = defineProps<{ initial?: Partial<ClientDraft> | null }>();
const model = defineModel<ClientDraft>({ required: true });
const directory = useDirectoryStore();
const tagText = ref('');

function sync(): void {
  Object.assign(model.value, {
    kind: 'person',
    name: '',
    national_id: null,
    phone: null,
    email: null,
    province: null,
    city: null,
    tags: [],
    notes: null,
    ...props.initial,
  });
  tagText.value = (model.value.tags ?? []).join('، ');
}
watch(tagText, (value) => {
  model.value.tags = value
    .split(/[,،;]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
});
watch(() => props.initial, sync);
onMounted(async () => {
  sync();
  await directory.loadTaxonomy().catch(() => undefined);
});
</script>

<template>
  <div class="form-row">
    <label class="field-label">
      نوع
      <select v-model="model.kind" class="select">
        <option value="person">شخص حقیقی</option>
        <option value="company">شخص حقوقی</option>
      </select>
    </label>
    <label class="field-label">
      نام<input v-model="model.name" class="input" required minlength="2" maxlength="255" />
    </label>
    <label class="field-label">
      {{ model.kind === 'company' ? 'شناسه ملی' : 'کد ملی' }}
      <input v-model="model.national_id" class="input" dir="ltr" inputmode="numeric" />
    </label>
    <label class="field-label">
      تلفن<input v-model="model.phone" class="input" dir="ltr" inputmode="tel" />
    </label>
    <label class="field-label">
      ایمیل<input v-model="model.email" class="input" type="email" dir="ltr" />
    </label>
    <label class="field-label">
      استان
      <select v-model="model.province" class="select">
        <option :value="null">—</option>
        <option v-for="province in directory.taxonomy?.provinces ?? []" :key="province">
          {{ province }}
        </option>
      </select>
    </label>
    <label class="field-label">شهر<input v-model="model.city" class="input" /></label>
    <label class="field-label">
      برچسب‌ها
      <input v-model="tagText" class="input" placeholder="مثلاً: صنعتی، VIP" />
    </label>
    <label class="field-label span-2">
      یادداشت<textarea v-model="model.notes" class="textarea" maxlength="3000" />
    </label>
  </div>
</template>
