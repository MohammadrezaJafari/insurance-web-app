<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import { createPolicy, updatePolicy } from '../api';
import { useDirectoryStore } from '../stores/directory';
import { errorMessage } from '../format';
import type { Policy, PolicyDraft, ProfileRef } from '../types';
import JalaliDateInput from './JalaliDateInput.vue';

/** Records a sold policy for a client, optionally closing a lead; or edits an existing one. */
const props = defineProps<{
  clientId: number | null;
  clientName?: string | undefined;
  opportunityId?: number | null;
  policy?: Policy | null;
  preset?: Partial<PolicyDraft>;
}>();
const emit = defineEmits<{ saved: [policy: Policy] }>();
const open = defineModel<boolean>({ default: false });

const lines = ref<string[]>([]);
const insurers = ref<ProfileRef[]>([]);
const busy = ref(false);
const error = ref('');
const draft = reactive<PolicyDraft>({
  insurance_line: '',
  insurer_slug: null,
  insurer_name: null,
  policy_number: null,
  premium: null,
  starts_on: null,
  ends_on: null,
});

function reset(): void {
  error.value = '';
  const policy = props.policy;
  Object.assign(
    draft,
    policy
      ? {
          insurance_line: policy.insurance_line,
          insurer_slug: policy.insurer_slug,
          insurer_name: policy.insurer_slug ? null : policy.insurer,
          policy_number: policy.policy_number,
          premium: policy.premium,
          starts_on: policy.starts_on,
          ends_on: policy.ends_on,
        }
      : {
          insurance_line: '',
          insurer_slug: null,
          insurer_name: null,
          policy_number: null,
          premium: null,
          starts_on: null,
          ends_on: null,
          ...props.preset,
        },
  );
}
function startChanged(value: string | null): void {
  if (!value || draft.ends_on) return;
  const end = new Date(value);
  end.setFullYear(end.getFullYear() + 1);
  draft.ends_on = end.toISOString().slice(0, 10);
}

async function save(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    const saved = props.policy
      ? await updatePolicy(props.policy.id, draft)
      : await createPolicy(props.clientId!, draft, props.opportunityId ?? null);
    emit('saved', saved);
    open.value = false;
  } catch (exception) {
    error.value = errorMessage(exception, 'ثبت ممکن نشد.');
  } finally {
    busy.value = false;
  }
}

watch(open, (value) => value && reset());
watch(() => draft.starts_on, startChanged);
onMounted(async () => {
  const directory = useDirectoryStore();
  await directory.loadTaxonomy().catch(() => undefined);
  lines.value = directory.taxonomy?.insurance_lines ?? [];
  insurers.value = directory.taxonomy?.insurers ?? [];
});
</script>

<template>
  <q-dialog v-model="open">
    <form class="dialog-card" @submit.prevent="save">
      <h2>{{ policy ? 'ویرایش بیمه‌نامه' : 'ثبت بیمه‌نامه' }}</h2>
      <p v-if="clientName">
        مشتری: <b>{{ clientName }}</b>
      </p>
      <div class="form-row">
        <label class="field-label">
          رشته بیمه
          <select v-model="draft.insurance_line" class="select" required>
            <option value="" disabled>انتخاب کنید</option>
            <option v-for="line in lines" :key="line">{{ line }}</option>
          </select>
        </label>
        <label class="field-label">
          شماره بیمه‌نامه
          <input v-model="draft.policy_number" class="input" dir="ltr" maxlength="64" />
        </label>
        <label class="field-label">
          شرکت بیمه
          <select v-model="draft.insurer_slug" class="select">
            <option :value="null">سایر / ثبت دستی</option>
            <option v-for="insurer in insurers" :key="insurer.slug" :value="insurer.slug">
              {{ insurer.name }}
            </option>
          </select>
        </label>
        <label v-if="!draft.insurer_slug" class="field-label">
          نام شرکت بیمه
          <input v-model="draft.insurer_name" class="input" maxlength="255" />
        </label>
        <label class="field-label span-2">
          حق بیمه (ریال)
          <input
            v-model.number="draft.premium"
            class="input"
            type="number"
            min="1"
            dir="ltr"
            required
          />
        </label>
        <label class="field-label"
          >شروع<JalaliDateInput v-model="draft.starts_on" required
        /></label>
        <label class="field-label">پایان<JalaliDateInput v-model="draft.ends_on" required /></label>
      </div>
      <p class="hint">
        بیمه‌نامه‌ای که به یک شرکت بیمهٔ اینشورهاب وصل باشد، تا تأیید آن شرکت «خوداظهاری» نمایش داده
        می‌شود.
      </p>
      <div v-if="error" class="notice notice--error">{{ error }}</div>
      <div class="dialog-actions">
        <button type="button" class="btn btn--ghost" @click="open = false">انصراف</button>
        <button class="btn btn--primary" :disabled="busy">ذخیره</button>
      </div>
    </form>
  </q-dialog>
</template>
