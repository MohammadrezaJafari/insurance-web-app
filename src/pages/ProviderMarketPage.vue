<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRouter } from 'vue-router';
import { joinMarketRequest, providerMarket } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { errorMessage, faDateTime, faMoneyShort, faNumber } from '../format';
import type { MarketRequest } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

useMeta({
  title: 'بازار فرصت‌ها | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const router = useRouter();
const requireAuth = useRequireAuth();
const items = ref<MarketRequest[] | null>(null);
const error = ref('');
const joining = ref<MarketRequest | null>(null);
const profile = ref('');
const conflict = ref(false);
const conflictNote = ref('');
const busy = ref(false);
const formError = ref('');

async function load(): Promise<void> {
  try {
    items.value = await providerMarket();
  } catch {
    error.value = 'دریافت فرصت‌ها ممکن نشد.';
  }
}
function start(item: MarketRequest): void {
  joining.value = item;
  profile.value = item.profiles[0]?.slug ?? '';
  conflict.value = false;
  conflictNote.value = '';
  formError.value = '';
}
async function join(): Promise<void> {
  if (!joining.value) return;
  busy.value = true;
  formError.value = '';
  try {
    const result = await joinMarketRequest(
      joining.value.reference,
      profile.value,
      conflict.value,
      conflict.value ? conflictNote.value : null,
    );
    await router.push(`/provider/invitations/${result.invitation_id}`);
  } catch (exception) {
    formError.value = errorMessage(exception, 'پیوستن ممکن نشد.');
    await load();
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  if (await requireAuth()) await load();
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">ارائه‌دهنده</div>
        <h1>بازار فرصت‌ها</h1>
      </div>
      <router-link to="/provider" class="btn btn--ghost">
        <q-icon name="inbox" size="18px" />دعوت‌های من
      </router-link>
    </div>
    <p class="muted-text" style="margin-top: -6px">
      درخواست‌هایی که بیمه‌گذار در بازار عمومی منتشر کرده و پروفایل شما شرایطشان را دارد. ظرفیت هر
      درخواست محدود است؛ با پیوستن، جزئیات و مدارک باز می‌شود و در صندوق فرصت‌هایتان ثبت می‌شود.
      هویت بیمه‌گذار تا انتخاب پیشنهاد شما پنهان می‌ماند.
    </p>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!items" class="skeleton" style="height: 240px" />
    <div v-else-if="!items.length" class="state">
      <q-icon name="storefront" />فعلاً فرصت عمومی متناسب با پروفایل‌های شما نیست.
    </div>
    <div v-else class="card-grid">
      <article v-for="item in items" :key="item.reference" class="card offer-card">
        <div class="offer-card__head">
          <span class="badge badge--brand">{{ item.type_label ?? item.insurance_line }}</span>
          <small class="muted-text">{{ faNumber(item.seats_left) }} جای خالی</small>
        </div>
        <h3>{{ item.title }}</h3>
        <p class="muted-text" style="margin: 0">
          {{ item.insurance_line }} · {{ item.province }}
          <template v-if="item.coverage_amount">
            · تعهد {{ faMoneyShort(item.coverage_amount) }}</template
          >
        </p>
        <small v-if="item.proposal_deadline_at" class="muted-text">
          مهلت پیشنهاد: {{ faDateTime(item.proposal_deadline_at) }}
        </small>
        <div v-if="item.profiles[0]?.fit" class="fit">
          <b>تناسب {{ faNumber(item.profiles[0].fit.score) }}٪</b>
          <div class="meter meter--success">
            <span :style="{ width: `${item.profiles[0].fit.score}%` }" />
          </div>
          <small class="muted-text">{{ item.profiles[0].fit.reasons.join('، ') }}</small>
        </div>
        <div class="chips">
          <span v-for="reason in item.profiles[0]?.reasons.slice(0, 3)" :key="reason" class="chip">
            {{ reason }}
          </span>
        </div>
        <footer class="offer-card__provider">
          <button class="btn btn--primary btn--block" @click="start(item)">
            پیوستن و ارائهٔ پیشنهاد
          </button>
        </footer>
      </article>
    </div>

    <q-dialog :model-value="joining !== null" @update:model-value="joining = null">
      <form class="dialog-card" @submit.prevent="join">
        <h2>پیوستن به «{{ joining?.title }}»</h2>
        <label v-if="(joining?.profiles.length ?? 0) > 1" class="field-label">
          با پروفایل
          <select v-model="profile" class="select">
            <option v-for="item in joining?.profiles" :key="item.slug" :value="item.slug">
              {{ item.name }}
            </option>
          </select>
        </label>
        <label class="check">
          <input v-model="conflict" type="checkbox" />با این درخواست تعارض منافع دارم (باید اعلام
          شود)
        </label>
        <textarea
          v-if="conflict"
          v-model="conflictNote"
          class="textarea"
          required
          maxlength="1000"
          placeholder="نوع رابطه یا منفعت را توضیح دهید؛ برای بیمه‌گذار نمایش داده می‌شود."
          aria-label="توضیح تعارض منافع"
        />
        <div v-if="formError" class="notice notice--error">{{ formError }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="joining = null">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">پیوستن</button>
        </div>
      </form>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
