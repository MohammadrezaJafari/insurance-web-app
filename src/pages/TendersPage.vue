<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import {
  ApiError,
  createOrganization,
  getOrganization,
  myOrganizations,
  myTenders,
  removeMember,
  setMember,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useTenderMeta } from '../composables/useTenderMeta';
import { faDateTime, faNumber, tenderStatuses } from '../format';
import type { OrganizationDetail, OrganizationSummary, OrgRole, TenderSummary } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';
import TenderDisclaimer from '../components/TenderDisclaimer.vue';

useMeta({
  title: 'مناقصه‌های بیمه | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const { meta, load: loadMeta } = useTenderMeta();
const organizations = ref<OrganizationSummary[] | null>(null);
const tenders = ref<TenderSummary[]>([]);
const disabled = ref(false);
const error = ref('');
const busy = ref(false);

const creatingOrg = ref(false);
const orgForm = reactive({ name: '', nationalId: '' });
const team = ref<OrganizationDetail | null>(null);
const memberForm = reactive<{ email: string; role: OrgRole }>({ email: '', role: 'evaluator' });
const formError = ref('');

const canCreateTender = computed(() =>
  organizations.value?.some((org) => ['owner', 'manager'].includes(org.role)),
);

async function load(): Promise<void> {
  const [orgs, list] = await Promise.all([myOrganizations(), myTenders()]);
  organizations.value = orgs;
  tenders.value = list;
}
function problem(exception: unknown, fallback: string): string {
  return exception instanceof ApiError
    ? (Object.values(exception.errors)[0]?.[0] ?? exception.message)
    : fallback;
}
async function saveOrganization(): Promise<void> {
  busy.value = true;
  formError.value = '';
  try {
    await createOrganization(orgForm.name, orgForm.nationalId || null);
    creatingOrg.value = false;
    Object.assign(orgForm, { name: '', nationalId: '' });
    await load();
  } catch (exception) {
    formError.value = problem(exception, 'ثبت سازمان ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
async function openTeam(id: number): Promise<void> {
  formError.value = '';
  team.value = await getOrganization(id);
}
async function addMember(): Promise<void> {
  if (!team.value) return;
  busy.value = true;
  formError.value = '';
  try {
    team.value = await setMember(team.value.id, memberForm.email, memberForm.role);
    memberForm.email = '';
    await load();
  } catch (exception) {
    formError.value = problem(exception, 'افزودن عضو ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
async function dropMember(memberId: number): Promise<void> {
  if (!team.value) return;
  try {
    team.value = await removeMember(team.value.id, memberId);
    await load();
  } catch (exception) {
    formError.value = problem(exception, 'حذف عضو ممکن نشد.');
  }
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  if (!(await loadMeta())) {
    disabled.value = true;
    return;
  }
  try {
    await load();
  } catch {
    error.value = 'دریافت اطلاعات ممکن نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">سازمان خریدار</div>
        <h1>مناقصه‌ها و اتاق پیشنهاد</h1>
      </div>
      <div v-if="organizations" class="stack-row">
        <button class="btn btn--outline" @click="creatingOrg = true">
          <q-icon name="domain_add" size="18px" />سازمان جدید
        </button>
        <router-link v-if="canCreateTender" to="/tenders/new" class="btn btn--primary">
          <q-icon name="add" size="18px" />مناقصهٔ جدید
        </router-link>
      </div>
    </div>
    <TenderDisclaimer />

    <div v-if="disabled" class="state">
      <q-icon name="lock_clock" />
      استعلام سازمانی و اتاق پیشنهاد هنوز فعال نشده است.
    </div>
    <div v-else-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!organizations" class="skeleton" style="height: 240px" />

    <div v-else class="profile-grid">
      <section class="card">
        <h2><q-icon name="gavel" />پروژه‌ها</h2>
        <div v-if="!tenders.length" class="state" style="padding: 32px 16px">
          <q-icon name="inventory_2" />
          {{
            organizations.length
              ? 'هنوز مناقصه‌ای ایجاد نشده است.'
              : 'ابتدا سازمان خود را ثبت کنید.'
          }}
        </div>
        <div class="result-list">
          <router-link
            v-for="tender in tenders"
            :key="tender.reference"
            :to="`/tenders/${tender.reference}`"
            class="actor-row"
          >
            <span class="tile tone-violet"><q-icon name="gavel" /></span>
            <div class="actor-row__body">
              <div class="actor-row__title">
                <h3>{{ tender.title }}</h3>
                <StatusBadge :status="tenderStatuses[tender.status]" />
              </div>
              <div class="actor-row__meta">
                {{ tender.organization.name }} · {{ tender.insurance_line }} ·
                {{ faNumber(tender.invitations_count ?? 0) }} دعوت
              </div>
              <div v-if="tender.submission_deadline_at" class="chips">
                <span class="chip"
                  ><q-icon name="schedule" /> مهلت پیشنهاد
                  {{ faDateTime(tender.submission_deadline_at) }}</span
                >
              </div>
            </div>
            <q-icon name="chevron_left" size="24px" class="actor-row__arrow" />
          </router-link>
        </div>
      </section>

      <aside>
        <section class="card">
          <h2><q-icon name="domain" />سازمان‌های من</h2>
          <p v-if="!organizations.length" class="muted-text">عضو سازمانی نیستید.</p>
          <div v-for="org in organizations" :key="org.id" class="review-item">
            <div>
              {{ org.name }}
              <small
                >{{ meta?.roles[org.role] }} · {{ faNumber(org.members_count) }} عضو ·
                {{ faNumber(org.tenders_count) }} مناقصه</small
              >
            </div>
            <button class="btn btn--ghost" @click="openTeam(org.id)">
              <q-icon name="group" />اعضا
            </button>
          </div>
        </section>
        <section class="card">
          <h2><q-icon name="info" />نقش‌ها</h2>
          <div class="kv"><b>مالک</b><span>مدیریت اعضا و همهٔ اختیارات مدیر</span></div>
          <div class="kv"><b>مدیر مناقصه</b><span>تعریف، دعوت، اسناد، پاسخ، تصمیم</span></div>
          <div class="kv"><b>ارزیاب</b><span>امتیازدهی پس از بازشدن پیشنهادها</span></div>
          <div class="kv"><b>ناظر</b><span>فقط مشاهده</span></div>
        </section>
      </aside>
    </div>

    <q-dialog v-model="creatingOrg">
      <form class="dialog-card" @submit.prevent="saveOrganization">
        <h2>ثبت سازمان خریدار</h2>
        <p>شما مالک سازمان می‌شوید و می‌توانید همکاران را با نقش مشخص اضافه کنید.</p>
        <label class="field-label"
          >نام سازمان<input v-model="orgForm.name" class="input" required minlength="3"
        /></label>
        <label class="field-label"
          >شناسه ملی (اختیاری)<input
            v-model="orgForm.nationalId"
            class="input"
            dir="ltr"
            inputmode="numeric"
        /></label>
        <div v-if="formError" class="notice notice--error">{{ formError }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="creatingOrg = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ثبت</button>
        </div>
      </form>
    </q-dialog>

    <q-dialog :model-value="team !== null" @hide="team = null">
      <div v-if="team" class="dialog-card">
        <h2>اعضای {{ team.name }}</h2>
        <p>دسترسی به هر مناقصه فقط برای اعضای همین سازمان و بر اساس نقش است.</p>
        <div v-for="member in team.members" :key="member.id" class="review-item">
          <div>
            {{ member.name }}
            <small dir="ltr" style="text-align: right">{{ member.email }}</small>
          </div>
          <span class="badge badge--neutral">{{ meta?.roles[member.role] }}</span>
          <button
            v-if="team.role === 'owner'"
            class="btn btn--ghost"
            :aria-label="`حذف ${member.name}`"
            @click="dropMember(member.id)"
          >
            <q-icon name="person_remove" />
          </button>
        </div>
        <form v-if="team.role === 'owner'" class="reminder-form" @submit.prevent="addMember">
          <input
            v-model="memberForm.email"
            class="input"
            type="email"
            dir="ltr"
            required
            placeholder="ایمیل حساب اینشورهاب"
            aria-label="ایمیل عضو"
          />
          <select v-model="memberForm.role" class="select" aria-label="نقش">
            <option v-for="(label, key) in meta?.roles" :key="key" :value="key">{{ label }}</option>
          </select>
          <button class="btn btn--primary" :disabled="busy">افزودن یا تغییر نقش</button>
        </form>
        <div v-if="formError" class="notice notice--error">{{ formError }}</div>
      </div>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
