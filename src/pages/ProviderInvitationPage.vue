<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import {
  ApiError,
  acceptInvitation,
  declineInvitation,
  getInvitation,
  getRequestMeta,
  openAttachment,
  providerMessage,
  submitProposal,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import {
  faDate,
  faDateTime,
  faMoney,
  faMoneyShort,
  faValue,
  fileSize,
  proposalLabels,
  invitationStatuses,
} from '../format';
import type { ProposalDraft, ProviderInvitation, RequestMeta } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import JalaliDateInput from '../components/JalaliDateInput.vue';
import StatusBadge from '../components/StatusBadge.vue';
import DeliveryPanel from '../components/DeliveryPanel.vue';
import MessageThread from '../components/MessageThread.vue';

useMeta({
  title: 'دعوت به ارائه پیشنهاد | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const requireAuth = useRequireAuth();
const id = Number(route.params.id);
const invitation = ref<ProviderInvitation | null>(null);
const meta = ref<RequestMeta | null>(null);
const error = ref('');
const actionError = ref('');
const fieldErrors = ref<Record<string, string[]>>({});
const busy = ref(false);
const declining = ref(false);
const declineReason = ref('');
const editing = ref(false);
const saved = ref('');
const proposal = reactive<ProposalDraft>({
  insurer_name: null,
  premium: null,
  coverage_amount: null,
  delivery_days: null,
  deductible: null,
  coverages: '',
  exclusions: null,
  services: null,
  valid_until: null,
  notes: null,
});
const accepting = ref(false);
const conflict = reactive<{ declared: boolean | null; note: string }>({ declared: null, note: '' });

const labels = computed(() => proposalLabels(invitation.value?.request.kind));
const accepted = computed(() => ['accepted', 'proposed'].includes(invitation.value?.status ?? ''));
const canAct = computed(() => invitation.value?.request.accepts_proposals ?? false);
const showForm = computed(
  () => accepted.value && canAct.value && (!invitation.value?.proposal || editing.value),
);
const fields = computed(
  () =>
    meta.value?.types.find((type) => type.key === invitation.value?.request.request_type)?.fields ??
    [],
);

function fillFromExisting(): void {
  const current = invitation.value?.proposal;
  if (!current) {
    proposal.coverage_amount = invitation.value?.request.coverage_amount ?? null;
    return;
  }
  Object.assign(proposal, {
    insurer_name: current.insurer_name,
    premium: current.premium,
    coverage_amount: current.coverage_amount,
    delivery_days: current.delivery_days,
    deductible: current.deductible,
    coverages: current.coverages,
    exclusions: current.exclusions,
    services: current.services,
    valid_until: current.valid_until,
    notes: current.notes,
  });
}

async function run(action: () => Promise<ProviderInvitation>, done = ''): Promise<void> {
  busy.value = true;
  actionError.value = '';
  fieldErrors.value = {};
  try {
    invitation.value = await action();
    declining.value = false;
    accepting.value = false;
    editing.value = false;
    saved.value = done;
    fillFromExisting();
  } catch (exception) {
    if (exception instanceof ApiError) {
      fieldErrors.value = exception.errors;
      actionError.value = Object.keys(exception.errors).length
        ? 'برخی فیلدها نیاز به اصلاح دارند.'
        : exception.message;
    } else {
      actionError.value = 'انجام این اقدام ممکن نشد.';
    }
  } finally {
    busy.value = false;
  }
}
function errorFor(key: string): string | undefined {
  return fieldErrors.value[key]?.[0];
}
async function reload(): Promise<void> {
  invitation.value = await getInvitation(id);
}
async function download(attachmentId: number): Promise<void> {
  try {
    await openAttachment(invitation.value!.request.reference, attachmentId);
  } catch (exception) {
    actionError.value =
      exception instanceof ApiError ? exception.message : 'باز کردن مدرک ممکن نشد.';
  }
}
const send = async (body: string) => (await providerMessage(id, body)).data;

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    [invitation.value, meta.value] = await Promise.all([getInvitation(id), getRequestMeta()]);
    fillFromExisting();
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
      <span>دعوت</span>
    </nav>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!invitation" class="skeleton" style="height: 240px" />

    <template v-else>
      <header class="profile-head">
        <span class="tile tile--lg tone-amber"><q-icon name="mark_email_unread" /></span>
        <div class="profile-head__body">
          <h1>{{ invitation.request.title }}</h1>
          <div class="profile-head__meta">
            {{ invitation.request.insurance_line }} · {{ invitation.request.province
            }}<template v-if="invitation.request.city">، {{ invitation.request.city }}</template>
            <template v-if="invitation.request.coverage_amount">
              · تعهد {{ faMoneyShort(invitation.request.coverage_amount) }}</template
            >
          </div>
          <div class="profile-head__badges">
            <StatusBadge :status="invitationStatuses[invitation.status]" />
            <span v-if="invitation.request.proposal_deadline_at" class="badge badge--neutral">
              <q-icon name="schedule" size="14px" />مهلت:
              {{ faDateTime(invitation.request.proposal_deadline_at) }}
            </span>
            <span class="badge badge--neutral">برای {{ invitation.provider.name }}</span>
          </div>
        </div>
        <div v-if="invitation.status === 'invited' && canAct" class="profile-head__actions">
          <button
            class="btn btn--primary"
            :disabled="busy"
            @click="
              accepting = !accepting;
              declining = false;
            "
          >
            <q-icon name="check" size="18px" />پذیرش و مشاهده جزئیات
          </button>
          <button
            class="btn btn--outline"
            :disabled="busy"
            @click="
              declining = !declining;
              accepting = false;
            "
          >
            رد دعوت
          </button>
        </div>
      </header>

      <form
        v-if="accepting"
        class="card cancel-box"
        @submit.prevent="
          run(() =>
            acceptInvitation(
              id,
              conflict.declared === true,
              conflict.declared ? conflict.note : null,
            ),
          )
        "
      >
        <h2><q-icon name="balance" />اعلام تعارض منافع</h2>
        <p class="muted-text">
          اگر با درخواست‌کننده یا موضوع بیمه نسبت شخصی یا مالی دارید، آن را اعلام کنید. این اعلام
          برای درخواست‌کننده و اپراتور نمایش داده می‌شود و مانع ارسال پیشنهاد نیست.
        </p>
        <label class="check">
          <input v-model="conflict.declared" type="radio" :value="false" name="conflict" required />
          تعارض منافعی ندارم
        </label>
        <label class="check">
          <input v-model="conflict.declared" type="radio" :value="true" name="conflict" />
          تعارض منافع دارم
        </label>
        <label v-if="conflict.declared" class="field-label">
          توضیح نسبت یا منفعت
          <textarea v-model="conflict.note" class="textarea" maxlength="1000" required />
        </label>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="accepting = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy || conflict.declared === null">
            تأیید و پذیرش
          </button>
        </div>
      </form>

      <form
        v-if="declining"
        class="card cancel-box"
        @submit.prevent="run(() => declineInvitation(id, declineReason))"
      >
        <label class="field-label">
          علت رد دعوت (به بهبود ارجاع کمک می‌کند)
          <select v-model="declineReason" class="select" required>
            <option value="" disabled>انتخاب کنید</option>
            <option v-for="reason in meta?.decline_reasons" :key="reason">{{ reason }}</option>
          </select>
        </label>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="declining = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ثبت رد دعوت</button>
        </div>
      </form>

      <div v-if="actionError" class="notice notice--error">{{ actionError }}</div>
      <div v-if="saved" class="notice">{{ saved }}</div>
      <div v-if="invitation.buyer" class="card outcome-box">
        <div>
          <b>پیشنهاد شما انتخاب شد.</b>
          برای صدور بیمه‌نامه با درخواست‌کننده تماس بگیرید: {{ invitation.buyer.name }} ·
          <a :href="`mailto:${invitation.buyer.email}`" class="link" dir="ltr">{{
            invitation.buyer.email
          }}</a>
        </div>
      </div>
      <div v-else-if="invitation.proposal?.status === 'not_selected'" class="notice notice--info">
        درخواست‌کننده پیشنهاد دیگری را انتخاب کرد یا استعلام را لغو کرد.
      </div>
      <div v-else-if="invitation.status === 'invited' && !canAct" class="notice notice--info">
        مهلت پاسخ به این دعوت تمام شده است.
      </div>

      <div class="profile-grid">
        <div>
          <section v-if="!accepted" class="card">
            <h2><q-icon name="info" />چرا این دعوت را دریافت کرده‌اید</h2>
            <div class="chips">
              <span v-for="reason in invitation.match_reasons" :key="reason" class="chip">{{
                reason
              }}</span>
            </div>
            <p class="card__note">
              جزئیات کامل، مدارک و گفت‌وگو با درخواست‌کننده پس از پذیرش دعوت نمایش داده می‌شود.
              اطلاعات تماس درخواست‌کننده فقط در صورت انتخاب پیشنهاد شما نمایش داده می‌شود.
            </p>
          </section>

          <section v-if="invitation.proposal && !editing" class="card">
            <h2><q-icon name="request_quote" />پیشنهاد ارسالی</h2>
            <div v-if="!labels.service" class="kv">
              <b>شرکت بیمه</b><span>{{ invitation.proposal.insurer_name || '—' }}</span>
            </div>
            <div class="kv">
              <b>{{ labels.premium }}</b
              ><span>{{ faMoney(invitation.proposal.premium) }}</span>
            </div>
            <div v-if="!labels.service" class="kv">
              <b>سقف تعهد</b><span>{{ faMoney(invitation.proposal.coverage_amount) }}</span>
            </div>
            <div v-if="labels.service" class="kv">
              <b>مدت انجام</b><span>{{ faValue(invitation.proposal.delivery_days) }} روز</span>
            </div>
            <div v-if="!labels.service" class="kv">
              <b>فرانشیز</b><span>{{ invitation.proposal.deductible || '—' }}</span>
            </div>
            <div class="kv">
              <b>{{ labels.coverages }}</b
              ><span class="pre">{{ invitation.proposal.coverages }}</span>
            </div>
            <div class="kv">
              <b>{{ labels.exclusions }}</b
              ><span class="pre">{{ invitation.proposal.exclusions || '—' }}</span>
            </div>
            <div class="kv">
              <b>{{ labels.services }}</b
              ><span class="pre">{{ invitation.proposal.services || '—' }}</span>
            </div>
            <div class="kv">
              <b>اعتبار تا</b><span>{{ faDate(invitation.proposal.valid_until) }}</span>
            </div>
            <button
              v-if="canAct && invitation.proposal.status === 'submitted'"
              class="btn btn--outline"
              style="margin-top: 12px"
              @click="editing = true"
            >
              ویرایش پیشنهاد
            </button>
          </section>

          <form
            v-if="showForm"
            class="card"
            @submit.prevent="
              run(
                () => submitProposal(id, proposal),
                'پیشنهاد ثبت شد و برای درخواست‌کننده قابل مقایسه است.',
              )
            "
          >
            <h2>
              <q-icon name="edit_note" />{{
                invitation.proposal ? 'ویرایش پیشنهاد' : 'ارسال پیشنهاد ساختاریافته'
              }}
            </h2>
            <div class="form-row">
              <label v-if="!labels.service" class="field-label">
                شرکت بیمه صادرکننده
                <input v-model="proposal.insurer_name" class="input" maxlength="255" />
              </label>
              <label v-else class="field-label">
                مدت انجام کار (روز)<span class="req">*</span>
                <input
                  v-model.number="proposal.delivery_days"
                  class="input"
                  type="number"
                  min="1"
                  max="365"
                  dir="ltr"
                  required
                />
                <span v-if="errorFor('delivery_days')" class="field-error">{{
                  errorFor('delivery_days')
                }}</span>
              </label>
              <label class="field-label">
                اعتبار پیشنهاد تا<span class="req">*</span>
                <JalaliDateInput
                  v-model="proposal.valid_until"
                  min="today"
                  required
                  label="اعتبار پیشنهاد تا"
                />
                <span v-if="errorFor('valid_until')" class="field-error">{{
                  errorFor('valid_until')
                }}</span>
              </label>
              <label class="field-label">
                {{ labels.premium }} (ریال)<span class="req">*</span>
                <input
                  v-model.number="proposal.premium"
                  class="input"
                  type="number"
                  min="1"
                  dir="ltr"
                  required
                />
                <small v-if="proposal.premium" class="hint">{{
                  faMoneyShort(proposal.premium)
                }}</small>
              </label>
              <label v-if="!labels.service" class="field-label">
                سقف تعهد (ریال)<span class="req">*</span>
                <input
                  v-model.number="proposal.coverage_amount"
                  class="input"
                  type="number"
                  min="1"
                  dir="ltr"
                  required
                />
                <small v-if="proposal.coverage_amount" class="hint">{{
                  faMoneyShort(proposal.coverage_amount)
                }}</small>
              </label>
              <label v-if="!labels.service" class="field-label span-2">
                فرانشیز
                <input
                  v-model="proposal.deductible"
                  class="input"
                  maxlength="255"
                  placeholder="مثلاً: ۱۰٪ هر خسارت، حداقل ۵۰ میلیون ریال"
                />
              </label>
              <label class="field-label span-2">
                {{ labels.coverages }}<span class="req">*</span>
                <textarea
                  v-model="proposal.coverages"
                  class="textarea"
                  minlength="10"
                  maxlength="3000"
                  required
                />
                <span v-if="errorFor('coverages')" class="field-error">{{
                  errorFor('coverages')
                }}</span>
              </label>
              <label class="field-label span-2">
                {{ labels.exclusions }}
                <textarea v-model="proposal.exclusions" class="textarea" maxlength="3000" />
              </label>
              <label class="field-label span-2">
                {{ labels.services }}
                <textarea
                  v-model="proposal.services"
                  class="textarea"
                  maxlength="2000"
                  placeholder="بازدید ریسک، پیگیری خسارت، …"
                />
              </label>
              <label class="field-label span-2">
                توضیحات
                <textarea v-model="proposal.notes" class="textarea" maxlength="2000" />
              </label>
            </div>
            <div class="dialog-actions">
              <button v-if="editing" type="button" class="btn btn--ghost" @click="editing = false">
                انصراف
              </button>
              <button class="btn btn--primary" :disabled="busy">
                <q-icon name="send" class="flip" size="18px" />ثبت پیشنهاد
              </button>
            </div>
          </form>

          <section v-if="accepted" class="card">
            <h2><q-icon name="forum" />پرسش و پاسخ با درخواست‌کننده</h2>
            <MessageThread
              :messages="invitation.messages"
              :can-write="['open', 'selected'].includes(invitation.request.status)"
              :send="send"
            />
          </section>
        </div>

        <aside>
          <DeliveryPanel
            v-if="invitation.delivery"
            :delivery="invitation.delivery"
            :reference="invitation.request.reference"
            role="provider"
            :invitation-id="invitation.id"
            @changed="reload"
          />
          <section class="card">
            <h2><q-icon name="assignment" />مشخصات درخواست</h2>
            <template v-if="invitation.request.details">
              <div v-for="field in fields" :key="field.key" class="kv">
                <b>{{ field.label }}</b
                ><span>{{ faValue(invitation.request.details[field.key]) }}</span>
              </div>
              <div v-if="invitation.request.desired_start_date" class="kv">
                <b>شروع پوشش</b><span>{{ faDate(invitation.request.desired_start_date) }}</span>
              </div>
              <p v-if="invitation.request.description" class="card__note pre">
                {{ invitation.request.description }}
              </p>
            </template>
            <p v-else class="muted-text">
              <q-icon name="lock" /> پس از پذیرش دعوت نمایش داده می‌شود.
            </p>
          </section>
          <section v-if="invitation.request.attachments.length" class="card">
            <h2><q-icon name="lock" />مدارک</h2>
            <p class="muted-text">مشاهدهٔ هر مدرک ثبت می‌شود.</p>
            <ul class="file-list">
              <li v-for="file in invitation.request.attachments" :key="file.id">
                <q-icon name="description" />
                <button class="link-button" @click="download(file.id)">{{ file.name }}</button>
                <small>{{ fileSize(file.size) }}</small>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
