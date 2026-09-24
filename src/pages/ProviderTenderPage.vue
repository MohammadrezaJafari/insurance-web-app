<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import {
  ApiError,
  askTender,
  getProviderTender,
  openTenderDocument,
  respondTender,
  submitTenderBid,
  withdrawTenderBid,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useTenderMeta } from '../composables/useTenderMeta';
import {
  faDate,
  faDateTime,
  faMoney,
  faMoneyShort,
  faNumber,
  fileSize,
  tenderInvitationStatuses,
  tenderStatuses,
} from '../format';
import type { BidDraft, ProviderTender } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';
import TenderDisclaimer from '../components/TenderDisclaimer.vue';

useMeta({
  title: 'اتاق پیشنهاد | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const requireAuth = useRequireAuth();
const { meta, load: loadMeta } = useTenderMeta();
const id = Number(route.params.id);
const room = ref<ProviderTender | null>(null);
const error = ref('');
const actionError = ref('');
const fieldErrors = ref<Record<string, string[]>>({});
const busy = ref(false);
const mode = ref<'' | 'accept' | 'decline'>('');
const conflict = reactive<{ declared: boolean | null; note: string }>({ declared: null, note: '' });
const declineReason = ref('');
const question = ref('');
const editing = ref(false);
const bid = reactive<BidDraft>({
  insurer_name: null,
  premium: null,
  coverage_amount: null,
  deductible: null,
  coverages: '',
  exclusions: null,
  services: null,
  experience: null,
  valid_until: null,
  notes: null,
});

const accepted = computed(() => room.value?.status === 'accepted' || room.value?.bid !== null);
const canBid = computed(() => room.value?.status === 'accepted' && room.value.tender.accepts_bids);
const showBidForm = computed(
  () =>
    canBid.value && (!room.value?.bid || room.value.bid.status === 'withdrawn' || editing.value),
);
const errorFor = (key: string) => fieldErrors.value[key]?.[0];

function fillBid(): void {
  const current = room.value?.bid;
  if (current) {
    Object.assign(bid, {
      insurer_name: current.insurer_name,
      premium: current.premium,
      coverage_amount: current.coverage_amount,
      deductible: current.deductible,
      coverages: current.coverages,
      exclusions: current.exclusions,
      services: current.services,
      experience: current.experience,
      valid_until: current.valid_until,
      notes: current.notes,
    });
  } else {
    bid.coverage_amount = room.value?.tender.coverage_amount ?? null;
  }
}
async function run(action: () => Promise<ProviderTender>, after?: () => void): Promise<void> {
  busy.value = true;
  actionError.value = '';
  fieldErrors.value = {};
  try {
    room.value = await action();
    mode.value = '';
    editing.value = false;
    fillBid();
    after?.();
  } catch (exception) {
    if (exception instanceof ApiError) {
      fieldErrors.value = exception.errors;
      actionError.value = Object.values(exception.errors)[0]?.[0] ?? exception.message;
    } else {
      actionError.value = 'انجام نشد.';
    }
  } finally {
    busy.value = false;
  }
}
async function openDocument(versionId: number): Promise<void> {
  try {
    await openTenderDocument(versionId);
  } catch (exception) {
    actionError.value =
      exception instanceof ApiError ? exception.message : 'باز کردن سند ممکن نشد.';
  }
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  await loadMeta();
  try {
    room.value = await getProviderTender(id);
    fillBid();
  } catch (exception) {
    error.value =
      exception instanceof ApiError && exception.status === 403
        ? 'این دعوت متعلق به پروفایل شما نیست.'
        : 'دعوت پیدا نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/provider">کارتابل دعوت‌ها</router-link>
      <q-icon name="chevron_left" />
      <span>مناقصه</span>
    </nav>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!room" class="skeleton" style="height: 240px" />

    <template v-else>
      <header class="profile-head">
        <span class="tile tile--lg tone-violet"><q-icon name="gavel" /></span>
        <div class="profile-head__body">
          <h1>{{ room.tender.title }}</h1>
          <div class="profile-head__meta">
            {{ room.tender.organization.name }} · {{ room.tender.insurance_line }}
            <template v-if="room.tender.coverage_amount">
              · تعهد {{ faMoneyShort(room.tender.coverage_amount) }}</template
            >
            · برای {{ room.provider.name }}
          </div>
          <div class="profile-head__badges">
            <StatusBadge :status="tenderStatuses[room.tender.status]" />
            <StatusBadge :status="tenderInvitationStatuses[room.status]" />
            <span class="badge badge--neutral"
              ><q-icon name="lock_clock" size="14px" />مهلت
              {{ faDateTime(room.tender.submission_deadline_at) }}</span
            >
          </div>
        </div>
        <div
          v-if="room.status === 'invited' && room.tender.accepts_bids"
          class="profile-head__actions"
        >
          <button class="btn btn--primary" @click="mode = mode === 'accept' ? '' : 'accept'">
            پذیرش و مشاهدهٔ اسناد
          </button>
          <button class="btn btn--outline" @click="mode = mode === 'decline' ? '' : 'decline'">
            انصراف از شرکت
          </button>
        </div>
      </header>
      <TenderDisclaimer />

      <form
        v-if="mode === 'accept'"
        class="card cancel-box"
        @submit.prevent="
          run(() =>
            respondTender(id, {
              accept: true,
              conflict_declared: conflict.declared === true,
              conflict_note: conflict.declared ? conflict.note : null,
            }),
          )
        "
      >
        <h2><q-icon name="balance" />اعلام تعارض منافع</h2>
        <label class="check"
          ><input
            v-model="conflict.declared"
            type="radio"
            :value="false"
            name="conflict"
            required
          />تعارض منافعی ندارم</label
        >
        <label class="check"
          ><input v-model="conflict.declared" type="radio" :value="true" name="conflict" />تعارض
          منافع دارم</label
        >
        <label v-if="conflict.declared" class="field-label"
          >توضیح<textarea v-model="conflict.note" class="textarea" required maxlength="1000" />
        </label>
        <div class="dialog-actions">
          <button class="btn btn--primary" :disabled="busy || conflict.declared === null">
            تأیید پذیرش
          </button>
        </div>
      </form>
      <form
        v-if="mode === 'decline'"
        class="card cancel-box"
        @submit.prevent="
          run(() => respondTender(id, { accept: false, decline_reason: declineReason }))
        "
      >
        <label class="field-label">
          علت انصراف
          <select v-model="declineReason" class="select" required>
            <option value="" disabled>انتخاب کنید</option>
            <option v-for="reason in meta?.decline_reasons" :key="reason">{{ reason }}</option>
          </select>
        </label>
        <div class="dialog-actions">
          <button class="btn btn--primary" :disabled="busy">ثبت انصراف</button>
        </div>
      </form>

      <div v-if="actionError" class="notice notice--error">{{ actionError }}</div>
      <div v-if="room.result === 'won'" class="card outcome-box">
        <div>
          <b>پیشنهاد شما برندهٔ این مناقصه شد.</b>
          برای ادامهٔ کار با
          <template v-for="(contact, index) in room.buyer_contact ?? []" :key="contact.email">
            <template v-if="index">، </template>{{ contact.name }} (<a
              :href="`mailto:${contact.email}`"
              class="link"
              dir="ltr"
              >{{ contact.email }}</a
            >)
          </template>
          تماس بگیرید.
        </div>
      </div>
      <div v-else-if="room.result === 'lost'" class="notice notice--info">
        این مناقصه به پیشنهاد دیگری واگذار شد. از مشارکت شما سپاسگزاریم.
      </div>
      <div v-else-if="room.tender.status === 'cancelled'" class="notice notice--error">
        این مناقصه توسط سازمان خریدار لغو شد.
      </div>
      <div v-else-if="room.tender.status === 'evaluation' && room.bid" class="notice notice--info">
        مهلت تمام شد و پیشنهاد شما در حال ارزیابی است.
      </div>

      <div class="profile-grid">
        <div>
          <section class="card">
            <h2><q-icon name="description" />شرح نیاز</h2>
            <p v-if="room.tender.description" class="pre">{{ room.tender.description }}</p>
            <p v-else class="muted-text">
              <q-icon name="lock" /> شرح کامل و اسناد پس از پذیرش دعوت نمایش داده می‌شود.
            </p>
          </section>

          <section v-if="room.bid && !editing" class="card">
            <h2>
              <q-icon name="request_quote" />پیشنهاد شما
              <small class="muted-text">نسخهٔ {{ faNumber(room.bid.revision) }}</small>
            </h2>
            <p v-if="room.bid.status === 'withdrawn'" class="notice notice--error">
              این پیشنهاد پس گرفته شده است.
            </p>
            <div class="kv">
              <b>حق بیمه</b><span>{{ faMoney(room.bid.premium) }}</span>
            </div>
            <div class="kv">
              <b>سقف تعهد</b><span>{{ faMoney(room.bid.coverage_amount) }}</span>
            </div>
            <div class="kv">
              <b>پوشش‌ها</b><span class="pre">{{ room.bid.coverages }}</span>
            </div>
            <div class="kv">
              <b>اعتبار تا</b><span>{{ faDate(room.bid.valid_until) }}</span>
            </div>
            <div
              v-if="canBid && room.bid.status === 'submitted'"
              class="stack-row"
              style="margin-top: 12px"
            >
              <button class="btn btn--outline" @click="editing = true">ویرایش پیشنهاد</button>
              <button
                class="btn btn--ghost"
                :disabled="busy"
                @click="run(() => withdrawTenderBid(id))"
              >
                پس گرفتن پیشنهاد
              </button>
            </div>
            <p class="card__note">
              <q-icon name="lock" /> تا پایان مهلت، سازمان خریدار محتوای پیشنهاد شما را نمی‌بیند.
            </p>
          </section>

          <form
            v-if="showBidForm"
            class="card"
            @submit.prevent="run(() => submitTenderBid(id, bid))"
          >
            <h2>
              <q-icon name="edit_note" />{{
                room.bid ? 'ویرایش پیشنهاد' : 'ارسال پیشنهاد مهر و موم‌شده'
              }}
            </h2>
            <div class="form-row">
              <label class="field-label"
                >شرکت بیمه صادرکننده<input v-model="bid.insurer_name" class="input" maxlength="255"
              /></label>
              <label class="field-label">
                اعتبار پیشنهاد تا<span class="req">*</span>
                <JalaliDateInput
                  v-model="bid.valid_until"
                  min="today"
                  required
                  label="اعتبار پیشنهاد"
                />
              </label>
              <label class="field-label">
                حق بیمه (ریال)<span class="req">*</span>
                <input
                  v-model.number="bid.premium"
                  class="input"
                  type="number"
                  min="1"
                  dir="ltr"
                  required
                />
                <small v-if="bid.premium" class="hint">{{ faMoneyShort(bid.premium) }}</small>
              </label>
              <label class="field-label">
                سقف تعهد (ریال)<span class="req">*</span>
                <input
                  v-model.number="bid.coverage_amount"
                  class="input"
                  type="number"
                  min="1"
                  dir="ltr"
                  required
                />
                <small v-if="bid.coverage_amount" class="hint">{{
                  faMoneyShort(bid.coverage_amount)
                }}</small>
              </label>
              <label class="field-label span-2"
                >فرانشیز<input v-model="bid.deductible" class="input" maxlength="255"
              /></label>
              <label class="field-label span-2">
                پوشش‌ها<span class="req">*</span>
                <textarea
                  v-model="bid.coverages"
                  class="textarea"
                  required
                  minlength="10"
                  maxlength="5000"
                />
                <span v-if="errorFor('coverages')" class="field-error">{{
                  errorFor('coverages')
                }}</span>
              </label>
              <label class="field-label span-2"
                >استثناها<textarea v-model="bid.exclusions" class="textarea" maxlength="5000" />
              </label>
              <label class="field-label span-2"
                >خدمات و پرداخت خسارت<textarea
                  v-model="bid.services"
                  class="textarea"
                  maxlength="3000"
                />
              </label>
              <label class="field-label span-2"
                >سابقه و توان<textarea v-model="bid.experience" class="textarea" maxlength="3000" />
              </label>
              <label class="field-label span-2"
                >توضیحات<textarea v-model="bid.notes" class="textarea" maxlength="3000" />
              </label>
            </div>
            <div class="dialog-actions">
              <button v-if="editing" type="button" class="btn btn--ghost" @click="editing = false">
                انصراف
              </button>
              <button class="btn btn--primary" :disabled="busy">
                <q-icon name="lock" size="18px" />ثبت پیشنهاد
              </button>
            </div>
          </form>

          <section v-if="accepted" class="card">
            <h2><q-icon name="forum" />پرسش و پاسخ</h2>
            <p class="muted-text">
              پاسخ‌ها برای همهٔ شرکت‌کنندگان منتشر می‌شود؛ نام پرسش‌کننده نمایش داده نمی‌شود.
            </p>
            <div v-for="item in room.questions" :key="item.id" class="qa">
              <div class="bubble" :class="{ 'bubble--mine': item.mine }">
                <small
                  >{{ item.mine ? 'پرسش شما' : 'پرسش یک شرکت‌کننده' }} ·
                  {{ faDateTime(item.asked_at) }}</small
                >{{ item.question }}
              </div>
              <div v-if="item.answer" class="bubble">
                <small>پاسخ سازمان · {{ faDateTime(item.answered_at) }}</small
                >{{ item.answer }}
              </div>
              <small v-else class="muted-text">در انتظار پاسخ</small>
            </div>
            <form
              v-if="room.tender.accepts_questions && room.status === 'accepted'"
              class="thread__form"
              style="margin-top: 10px"
              @submit.prevent="
                run(
                  () => askTender(id, question),
                  () => (question = ''),
                )
              "
            >
              <input
                v-model="question"
                class="input"
                minlength="10"
                maxlength="2000"
                required
                placeholder="پرسش شما دربارهٔ شرایط مناقصه"
                aria-label="پرسش"
              />
              <button class="btn btn--primary" :disabled="busy">ارسال</button>
            </form>
            <p v-else-if="room.status === 'accepted'" class="card__note">
              مهلت طرح پرسش ({{ faDateTime(room.tender.questions_deadline_at) }}) تمام شده است.
            </p>
          </section>
        </div>

        <aside>
          <section class="card">
            <h2><q-icon name="balance" />معیارهای ارزیابی</h2>
            <div v-for="(criterion, key) in room.tender.criteria" :key="key" class="kv">
              <b>{{ criterion.label }}</b
              ><span>{{ faNumber(criterion.weight) }}٪</span>
            </div>
          </section>
          <section v-if="room.tender.documents.length" class="card">
            <h2><q-icon name="folder" />اسناد</h2>
            <div v-for="document in room.tender.documents" :key="document.id" class="doc">
              <b>{{ document.title }}</b>
              <ol class="timeline">
                <li v-for="(version, index) in document.versions" :key="version.id">
                  <button class="link-button" @click="openDocument(version.id)">
                    نسخهٔ {{ faNumber(version.version)
                    }}<template v-if="index === 0"> (آخرین)</template>
                  </button>
                  <small
                    >{{ faDateTime(version.uploaded_at) }} · {{ fileSize(version.size)
                    }}<template v-if="version.change_note">
                      · {{ version.change_note }}</template
                    ></small
                  >
                </li>
              </ol>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
