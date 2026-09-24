<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import {
  ApiError,
  buyerMessage,
  cancelRequest,
  closeRequest,
  getRequest,
  getRequestMeta,
  openAttachment,
  selectProposal,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import {
  actorTypes,
  faDate,
  faDateTime,
  faMoney,
  faValue,
  faMoneyShort,
  fileSize,
  invitationStatuses,
  proposalLabels,
  requestStatuses,
} from '../format';
import type { BuyerInvitation, Proposal, RequestDetail, RequestMeta } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';
import MessageThread from '../components/MessageThread.vue';

useMeta({
  title: 'جزئیات استعلام | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const requireAuth = useRequireAuth();
const reference = String(route.params.reference);
const item = ref<RequestDetail | null>(null);
const meta = ref<RequestMeta | null>(null);
const error = ref('');
const actionError = ref('');
const busy = ref(false);
const confirmingId = ref<number | null>(null);
const cancelReason = ref('');
const showCancel = ref(false);

type Offer = { invitation: BuyerInvitation; proposal: Proposal };
const offers = computed<Offer[]>(() =>
  (item.value?.invitations ?? [])
    .filter((invitation) => invitation.proposal)
    .map((invitation) => ({ invitation, proposal: invitation.proposal! }))
    .sort((a, b) => a.proposal.premium - b.proposal.premium),
);
const labels = computed(() => proposalLabels(item.value?.kind));
const lowestPremium = computed(() =>
  Math.min(...offers.value.map((offer) => offer.proposal.premium)),
);
const highestCoverage = computed(() =>
  Math.max(...offers.value.map((offer) => offer.proposal.coverage_amount ?? 0)),
);
const fields = computed(
  () => meta.value?.types.find((type) => type.key === item.value?.request_type)?.fields ?? [],
);
const canSelect = computed(() => item.value?.status === 'open');
const canCancel = computed(() => ['draft', 'submitted', 'open'].includes(item.value?.status ?? ''));
const messageable = computed(() => ['open', 'selected'].includes(item.value?.status ?? ''));

async function run(action: () => Promise<RequestDetail>): Promise<void> {
  busy.value = true;
  actionError.value = '';
  try {
    item.value = await action();
    confirmingId.value = null;
    showCancel.value = false;
  } catch (exception) {
    actionError.value =
      exception instanceof ApiError ? exception.message : 'انجام این اقدام ممکن نشد.';
  } finally {
    busy.value = false;
  }
}
async function download(id: number): Promise<void> {
  try {
    await openAttachment(reference, id);
  } catch (exception) {
    actionError.value =
      exception instanceof ApiError ? exception.message : 'باز کردن مدرک ممکن نشد.';
  }
}
const send = (invitation: BuyerInvitation) => async (body: string) =>
  (await buyerMessage(reference, invitation.id, body)).data;

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    [item.value, meta.value] = await Promise.all([getRequest(reference), getRequestMeta()]);
  } catch (exception) {
    error.value =
      exception instanceof ApiError && exception.status === 403
        ? 'به این استعلام دسترسی ندارید.'
        : 'این استعلام پیدا نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/requests">استعلام‌های من</router-link>
      <q-icon name="chevron_left" />
      <span>جزئیات</span>
    </nav>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!item" class="skeleton" style="height: 240px" />

    <template v-else>
      <header class="profile-head">
        <span class="tile tile--lg tone-blue"><q-icon name="request_quote" /></span>
        <div class="profile-head__body">
          <h1>{{ item.title }}</h1>
          <div class="profile-head__meta">
            {{ item.insurance_line }} · {{ item.province
            }}<template v-if="item.city">، {{ item.city }}</template>
            <template v-if="item.coverage_amount">
              · تعهد {{ faMoneyShort(item.coverage_amount) }}</template
            >
          </div>
          <div class="profile-head__badges">
            <StatusBadge :status="requestStatuses[item.status]" />
            <span
              v-if="item.proposal_deadline_at && item.status === 'open'"
              class="badge badge--neutral"
            >
              <q-icon name="schedule" size="14px" />مهلت پیشنهاد:
              {{ faDateTime(item.proposal_deadline_at) }}
            </span>
          </div>
        </div>
        <div v-if="canCancel" class="profile-head__actions">
          <router-link
            v-if="item.status === 'draft'"
            :to="`/requests/${item.reference}/edit`"
            class="btn btn--primary"
          >
            ادامه ویرایش
          </router-link>
          <button class="btn btn--outline" @click="showCancel = !showCancel">لغو استعلام</button>
        </div>
      </header>

      <form
        v-if="showCancel"
        class="card cancel-box"
        @submit.prevent="run(() => cancelRequest(reference, cancelReason))"
      >
        <label class="field-label">
          چرا استعلام را لغو می‌کنید؟ (برای بهبود خدمات ثبت می‌شود)
          <select v-model="cancelReason" class="select" required>
            <option value="" disabled>انتخاب کنید</option>
            <option v-for="reason in meta?.outcome_reasons" :key="reason">{{ reason }}</option>
          </select>
        </label>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="showCancel = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">تأیید لغو</button>
        </div>
      </form>

      <div v-if="actionError" class="notice notice--error">{{ actionError }}</div>
      <div v-if="item.status === 'submitted'" class="notice notice--info">
        درخواست شما در صف بررسی اپراتور است. پس از تأیید، برای ارائه‌دهندگان واجد شرایط ارسال
        می‌شود.
      </div>
      <div v-else-if="item.status === 'rejected'" class="notice notice--error">
        این درخواست توسط اپراتور رد شد<template v-if="item.operator_note"
          >: {{ item.operator_note }}</template
        >
      </div>
      <div v-else-if="item.status === 'open' && !offers.length" class="notice notice--info">
        درخواست برای {{ item.invitations.length.toLocaleString('fa-IR') }} ارائه‌دهنده ارسال شد.
        پیشنهادها به‌محض دریافت در این صفحه قابل مقایسه‌اند.
      </div>
      <div v-else-if="item.status === 'selected'" class="card outcome-box">
        <div>
          <b>پیشنهاد انتخاب شد.</b>
          ارائه‌دهنده اکنون اطلاعات تماس شما را می‌بیند و برای صدور بیمه‌نامه پیگیری می‌کند. پس از
          نهایی‌شدن، نتیجه را ثبت کنید.
        </div>
        <div class="stack-row">
          <button
            class="btn btn--primary"
            :disabled="busy"
            @click="run(() => closeRequest(reference, true))"
          >
            بیمه‌نامه صادر شد
          </button>
          <button
            class="btn btn--outline"
            :disabled="busy"
            @click="run(() => closeRequest(reference, false))"
          >
            صادر نشد
          </button>
        </div>
      </div>
      <div v-else-if="item.status === 'closed'" class="notice">
        این استعلام بسته شد{{ item.policy_issued ? ' و بیمه‌نامه صادر شد' : '' }}.
      </div>

      <div class="profile-grid">
        <div>
          <section v-if="offers.length" class="card">
            <h2><q-icon name="compare_arrows" />مقایسه پیشنهادها</h2>
            <div class="compare-scroll">
              <table class="compare">
                <thead>
                  <tr>
                    <th scope="row">ارائه‌دهنده</th>
                    <th
                      v-for="offer in offers"
                      :key="offer.proposal.id"
                      scope="col"
                      :class="{ chosen: offer.proposal.status === 'selected' }"
                    >
                      <router-link
                        :to="`/profiles/${offer.invitation.provider.slug}`"
                        class="link"
                        >{{ offer.invitation.provider.name }}</router-link
                      >
                      <small>{{ actorTypes[offer.invitation.provider.type].label }}</small>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!labels.service">
                    <th scope="row">شرکت بیمه</th>
                    <td v-for="offer in offers" :key="offer.proposal.id">
                      {{ offer.proposal.insurer_name || '—' }}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{{ labels.premium }}</th>
                    <td v-for="offer in offers" :key="offer.proposal.id">
                      <b>{{ faMoney(offer.proposal.premium) }}</b>
                      <span
                        v-if="offers.length > 1 && offer.proposal.premium === lowestPremium"
                        class="badge badge--verified"
                        >کمترین</span
                      >
                    </td>
                  </tr>
                  <tr v-if="labels.service">
                    <th scope="row">مدت انجام</th>
                    <td v-for="offer in offers" :key="offer.proposal.id">
                      {{ faValue(offer.proposal.delivery_days) }} روز
                    </td>
                  </tr>
                  <tr v-if="!labels.service">
                    <th scope="row">سقف تعهد</th>
                    <td v-for="offer in offers" :key="offer.proposal.id">
                      {{ faMoney(offer.proposal.coverage_amount) }}
                      <span
                        v-if="
                          offers.length > 1 && offer.proposal.coverage_amount === highestCoverage
                        "
                        class="badge badge--brand"
                        >بیشترین</span
                      >
                    </td>
                  </tr>
                  <tr v-if="!labels.service">
                    <th scope="row">فرانشیز</th>
                    <td v-for="offer in offers" :key="offer.proposal.id">
                      {{ offer.proposal.deductible || '—' }}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{{ labels.coverages }}</th>
                    <td v-for="offer in offers" :key="offer.proposal.id" class="pre">
                      {{ offer.proposal.coverages }}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{{ labels.exclusions }}</th>
                    <td v-for="offer in offers" :key="offer.proposal.id" class="pre">
                      {{ offer.proposal.exclusions || '—' }}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{{ labels.services }}</th>
                    <td v-for="offer in offers" :key="offer.proposal.id" class="pre">
                      {{ offer.proposal.services || '—' }}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">اعتبار پیشنهاد</th>
                    <td v-for="offer in offers" :key="offer.proposal.id">
                      تا {{ faDate(offer.proposal.valid_until) }}
                      <small v-if="offer.proposal.revision > 1" class="muted-text"
                        >(نسخه {{ offer.proposal.revision.toLocaleString('fa-IR') }})</small
                      >
                    </td>
                  </tr>
                  <tr v-if="offers.some((offer) => offer.proposal.notes)">
                    <th scope="row">توضیحات</th>
                    <td v-for="offer in offers" :key="offer.proposal.id" class="pre">
                      {{ offer.proposal.notes || '—' }}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row"></th>
                    <td v-for="offer in offers" :key="offer.proposal.id">
                      <span
                        v-if="offer.proposal.status === 'selected'"
                        class="badge badge--verified"
                        ><q-icon name="check" />انتخاب شما</span
                      >
                      <template v-else-if="canSelect">
                        <button
                          v-if="confirmingId !== offer.proposal.id"
                          class="btn btn--outline btn--block"
                          @click="confirmingId = offer.proposal.id"
                        >
                          انتخاب این پیشنهاد
                        </button>
                        <div v-else class="stack">
                          <small>با انتخاب، سایر پیشنهادها بسته می‌شوند.</small>
                          <button
                            class="btn btn--primary btn--block"
                            :disabled="busy"
                            @click="run(() => selectProposal(reference, offer.proposal.id))"
                          >
                            تأیید انتخاب
                          </button>
                          <button class="btn btn--ghost btn--block" @click="confirmingId = null">
                            انصراف
                          </button>
                        </div>
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-if="item.invitations.length" class="card">
            <h2><q-icon name="groups" />ارائه‌دهندگان دعوت‌شده</h2>
            <p class="muted-text">
              این ارائه‌دهندگان با قواعد مشخص (رشته، منطقه، مجوز بررسی‌شده و ظرفیت) انتخاب شده‌اند؛
              دلیل انتخاب هر کدام زیر نامش آمده است.
            </p>
            <details
              v-for="invitation in item.invitations"
              :key="invitation.id"
              class="provider-item"
              :open="invitation.messages.length > 0"
            >
              <summary>
                <span
                  class="tile tile--sm"
                  :class="`tone-${actorTypes[invitation.provider.type].tone}`"
                  ><q-icon :name="actorTypes[invitation.provider.type].icon"
                /></span>
                <span class="provider-item__name">
                  {{ invitation.provider.name }}
                  <small>{{ invitation.match_reasons.join(' · ') }}</small>
                </span>
                <StatusBadge :status="invitationStatuses[invitation.status]" />
              </summary>
              <div
                v-if="invitation.conflict_declared"
                class="notice notice--error"
                style="margin-top: 8px"
              >
                <b>تعارض منافع اعلام‌شده:</b> {{ invitation.conflict_note }}
              </div>
              <p v-if="invitation.decline_reason" class="muted-text">
                علت: {{ invitation.decline_reason }}
              </p>
              <MessageThread
                v-if="
                  invitation.status === 'accepted' ||
                  invitation.status === 'proposed' ||
                  invitation.messages.length
                "
                :messages="invitation.messages"
                :can-write="
                  messageable &&
                  (invitation.status === 'accepted' || invitation.status === 'proposed')
                "
                :send="send(invitation)"
              />
            </details>
          </section>
        </div>

        <aside>
          <section class="card">
            <h2><q-icon name="assignment" />مشخصات درخواست</h2>
            <div v-for="field in fields" :key="field.key" class="kv">
              <b>{{ field.label }}</b>
              <span>{{ faValue(item.details[field.key]) }}</span>
            </div>
            <div v-if="item.desired_start_date" class="kv">
              <b>شروع پوشش</b><span>{{ faDate(item.desired_start_date) }}</span>
            </div>
            <p v-if="item.description" class="card__note pre">{{ item.description }}</p>
          </section>

          <section v-if="item.attachments.length" class="card">
            <h2><q-icon name="lock" />مدارک خصوصی</h2>
            <ul class="file-list">
              <li v-for="file in item.attachments" :key="file.id">
                <q-icon name="description" />
                <button class="link-button" @click="download(file.id)">{{ file.name }}</button>
                <small>{{ fileSize(file.size) }}</small>
              </li>
            </ul>
          </section>

          <section class="card">
            <h2><q-icon name="timeline" />روند</h2>
            <ol class="timeline">
              <li>
                <b>ایجاد پیش‌نویس</b><small>{{ faDateTime(item.created_at) }}</small>
              </li>
              <li v-for="step in item.timeline" :key="step.at + step.status">
                <b>{{ requestStatuses[step.status]?.label }}</b
                ><small>{{ faDateTime(step.at) }}</small>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
