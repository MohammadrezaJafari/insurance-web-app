<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { providerInvitations, providerTenders } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import {
  faDateTime,
  faMoneyShort,
  invitationStatuses,
  tenderInvitationStatuses,
  tenderStatuses,
} from '../format';
import type { ProviderInvitation, ProviderTenderSummary } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({
  title: 'کارتابل دعوت‌ها | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const invitations = ref<ProviderInvitation[] | null>(null);
const tenders = ref<ProviderTenderSummary[]>([]);
const error = ref('');
const tab = ref<'active' | 'done'>('active');
const visible = computed(() =>
  (invitations.value ?? []).filter((invitation) =>
    tab.value === 'active'
      ? ['invited', 'accepted', 'proposed'].includes(invitation.status) &&
        ['open', 'selected'].includes(invitation.request.status)
      : !(
          ['invited', 'accepted', 'proposed'].includes(invitation.status) &&
          ['open', 'selected'].includes(invitation.request.status)
        ),
  ),
);

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    invitations.value = await providerInvitations();
    tenders.value = await providerTenders().catch(() => []);
  } catch {
    error.value = 'دریافت دعوت‌ها ممکن نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">ارائه‌دهنده</div>
        <h1>کارتابل دعوت‌ها</h1>
      </div>
      <router-link to="/provider/market" class="btn btn--amber">
        <q-icon name="storefront" size="18px" />بازار فرصت‌ها
      </router-link>
      <router-link to="/crm" class="btn btn--outline">
        <q-icon name="view_kanban" size="18px" />صندوق فرصت‌ها
      </router-link>
      <div class="segmented" style="margin: 0; min-width: 240px" role="tablist">
        <button role="tab" :class="{ active: tab === 'active' }" @click="tab = 'active'">
          فعال
        </button>
        <button role="tab" :class="{ active: tab === 'done' }" @click="tab = 'done'">
          پایان‌یافته
        </button>
      </div>
    </div>
    <p class="muted-text" style="margin-top: -8px">
      درخواست‌ها بر اساس رشته، منطقه و مجوز بررسی‌شدهٔ پروفایل شما ارسال می‌شوند. جزئیات و مدارک پس
      از پذیرش دعوت نمایش داده می‌شود.
    </p>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!invitations" class="result-list">
      <div v-for="n in 3" :key="n" class="skeleton" />
    </div>
    <div v-else-if="!visible.length" class="state">
      <q-icon name="inbox" />
      {{ tab === 'active' ? 'دعوت فعالی ندارید.' : 'موردی وجود ندارد.' }}
    </div>
    <div v-else class="result-list">
      <router-link
        v-for="invitation in visible"
        :key="invitation.id"
        :to="`/provider/invitations/${invitation.id}`"
        class="actor-row"
      >
        <span class="tile tone-amber"><q-icon name="mark_email_unread" /></span>
        <div class="actor-row__body">
          <div class="actor-row__title">
            <h3>{{ invitation.request.title }}</h3>
            <StatusBadge :status="invitationStatuses[invitation.status]" />
            <span v-if="invitation.proposal?.status === 'selected'" class="badge badge--verified"
              ><q-icon name="emoji_events" size="14px" />انتخاب شد</span
            >
          </div>
          <div class="actor-row__meta">
            {{ invitation.request.insurance_line }} · {{ invitation.request.province }}
            <template v-if="invitation.request.coverage_amount">
              · تعهد {{ faMoneyShort(invitation.request.coverage_amount) }}</template
            >
            · برای {{ invitation.provider.name }}
          </div>
          <div v-if="invitation.request.proposal_deadline_at" class="chips">
            <span class="chip"
              ><q-icon name="schedule" /> مهلت
              {{ faDateTime(invitation.request.proposal_deadline_at) }}</span
            >
          </div>
        </div>
        <q-icon name="chevron_left" size="24px" class="actor-row__arrow" />
      </router-link>
    </div>

    <section v-if="tenders.length" style="margin-top: 32px">
      <h2 class="section-title">دعوت به مناقصه‌های سازمانی</h2>
      <div class="result-list">
        <router-link
          v-for="item in tenders"
          :key="item.id"
          :to="`/provider/tenders/${item.id}`"
          class="actor-row"
        >
          <span class="tile tone-violet"><q-icon name="gavel" /></span>
          <div class="actor-row__body">
            <div class="actor-row__title">
              <h3>{{ item.tender.title }}</h3>
              <StatusBadge :status="tenderStatuses[item.tender.status]" />
              <StatusBadge :status="tenderInvitationStatuses[item.status]" />
            </div>
            <div class="actor-row__meta">
              {{ item.tender.organization.name }} · {{ item.tender.insurance_line }} · برای
              {{ item.provider }}
              <template v-if="item.tender.submission_deadline_at">
                · مهلت {{ faDateTime(item.tender.submission_deadline_at) }}</template
              >
            </div>
          </div>
          <q-icon name="chevron_left" size="24px" class="actor-row__arrow" />
        </router-link>
      </div>
    </section>
  </main>
  <SiteFooter />
</template>
