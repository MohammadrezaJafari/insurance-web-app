<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import { getTender } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { faDateTime, faMoney, faNumber, tenderInvitationStatuses, tenderStatuses } from '../format';
import type { TenderDetail } from '../types';

useMeta({
  title: 'گزارش مناقصه | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const requireAuth = useRequireAuth();
const reference = String(route.params.reference);
const tender = ref<TenderDetail | null>(null);
const error = ref('');
const ranked = computed(() =>
  [...(tender.value?.bids ?? [])].sort(
    (a, b) => (b.evaluation?.total ?? -1) - (a.evaluation?.total ?? -1) || a.premium - b.premium,
  ),
);
const printedAt = new Date().toISOString();
const print = () => window.print();

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    tender.value = await getTender(reference);
  } catch {
    error.value = 'گزارش در دسترس نیست.';
  }
});
</script>

<template>
  <main class="report">
    <div class="report__actions no-print">
      <router-link :to="`/tenders/${reference}`" class="btn btn--ghost">بازگشت</router-link>
      <button class="btn btn--primary" @click="print">
        <q-icon name="print" size="18px" />چاپ یا ذخیرهٔ PDF
      </button>
    </div>
    <p v-if="error" class="notice notice--error">{{ error }}</p>
    <template v-else-if="tender">
      <header>
        <small>اینشورهاب · گزارش مقایسهٔ پیشنهادها و صورت‌جلسه</small>
        <h1>{{ tender.title }}</h1>
        <p>
          {{ tender.organization.name }} · {{ tender.insurance_line }} · وضعیت:
          {{ tenderStatuses[tender.status]?.label }} · مهلت پیشنهاد:
          {{ faDateTime(tender.submission_deadline_at) }}
        </p>
      </header>

      <h2>شرکت‌کنندگان</h2>
      <table>
        <thead>
          <tr>
            <th>ارائه‌دهنده</th>
            <th>وضعیت دعوت</th>
            <th>تعارض منافع اعلام‌شده</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="invitation in tender.invitations" :key="invitation.id">
            <td>{{ invitation.provider.name }}</td>
            <td>{{ tenderInvitationStatuses[invitation.status]?.label }}</td>
            <td>{{ invitation.conflict_declared ? invitation.conflict_note : 'ندارد' }}</td>
          </tr>
        </tbody>
      </table>

      <h2>مقایسهٔ پیشنهادها</h2>
      <p v-if="!tender.bids_unsealed">پیشنهادها هنوز مهر و موم‌اند.</p>
      <table v-else>
        <thead>
          <tr>
            <th>ارائه‌دهنده</th>
            <th>شرکت بیمه</th>
            <th>حق بیمه</th>
            <th>سقف تعهد</th>
            <th>فرانشیز</th>
            <th v-for="(criterion, key) in tender.criteria" :key="key">
              {{ criterion.label }} ({{ faNumber(criterion.weight) }}٪)
            </th>
            <th>امتیاز نهایی</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="bid in ranked" :key="bid.id" :class="{ winner: bid.status === 'awarded' }">
            <td>{{ bid.provider.name }}<template v-if="bid.status === 'awarded'"> ✓</template></td>
            <td>{{ bid.insurer_name || '—' }}</td>
            <td>{{ faMoney(bid.premium) }}</td>
            <td>{{ faMoney(bid.coverage_amount) }}</td>
            <td>{{ bid.deductible || '—' }}</td>
            <td v-for="(criterion, key) in tender.criteria" :key="key">
              {{
                bid.evaluation?.averages[key] !== null &&
                bid.evaluation?.averages[key] !== undefined
                  ? faNumber(bid.evaluation.averages[key]!)
                  : '—'
              }}
            </td>
            <td>
              {{
                bid.evaluation?.total !== null && bid.evaluation?.total !== undefined
                  ? faNumber(bid.evaluation.total)
                  : '—'
              }}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>پرسش و پاسخ‌های منتشرشده</h2>
      <p v-if="!tender.questions.some((q) => q.answer)">—</p>
      <dl>
        <template v-for="question in tender.questions.filter((q) => q.answer)" :key="question.id">
          <dt>{{ question.question }}</dt>
          <dd>{{ question.answer }}</dd>
        </template>
      </dl>

      <h2>صورت‌جلسهٔ تصمیم</h2>
      <p v-if="tender.decision_minutes" class="pre">{{ tender.decision_minutes }}</p>
      <p v-else>تصمیم هنوز ثبت نشده است.</p>
      <p v-if="tender.decided_at">تاریخ تصمیم: {{ faDateTime(tender.decided_at) }}</p>

      <footer>
        تهیه‌شده در {{ faDateTime(printedAt) }} · شناسهٔ مناقصه:
        <span dir="ltr">{{ tender.reference }}</span> · این گزارش جایگزین مستندات رسمی مناقصه نیست.
      </footer>
    </template>
  </main>
</template>
