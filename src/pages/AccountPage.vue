<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import {
  ApiError,
  claimProfile,
  getActor,
  login,
  myChangeRequests,
  myClaims,
  myProfiles,
  register,
  requestChange,
} from '../api';
import { useAuthStore } from '../stores/auth';
import {
  actorTypes,
  faDate,
  faNumber,
  fieldLabels,
  referralChannels,
  socialNetworks,
  statusLabels,
} from '../format';
import type { Actor, EditableFields, OwnedProfile, ReviewItem } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

useMeta({
  title: 'حساب کاربری | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const claimSlug = computed(() => (typeof route.query.claim === 'string' ? route.query.claim : ''));
const mode = ref<'login' | 'register'>('login');
const credentials = reactive({ name: '', email: '', password: '' });
const busy = ref(false);
const error = ref('');
const message = ref('');

const claimTarget = ref<Actor | null>(null);
const claimReason = ref('');

const profiles = ref<OwnedProfile[]>([]);
const claims = ref<ReviewItem[]>([]);
const changes = ref<ReviewItem[]>([]);
const editing = ref('');
const isProvider = computed(() => profiles.value.some((profile) => profile.type !== 'insurer'));
const isInsurer = computed(() => profiles.value.some((profile) => profile.type === 'insurer'));
const toolGroups = computed(() =>
  [
    {
      title: 'کسب‌وکار',
      tools: [
        ...(isProvider.value
          ? [
              { to: '/provider', label: 'کارتابل دعوت‌ها', icon: 'inbox' },
              { to: '/provider/market', label: 'بازار فرصت‌ها', icon: 'storefront' },
              { to: '/crm', label: 'صندوق فرصت‌ها و مشتریان', icon: 'view_kanban' },
              { to: '/crm/assistant', label: 'دستیار فروش', icon: 'auto_awesome' },
            ]
          : []),
        ...(isInsurer.value
          ? [{ to: '/insurer', label: 'داشبورد شرکت بیمه', icon: 'insights' }]
          : []),
      ],
    },
    {
      title: 'حضور و معرفی',
      tools: profiles.value.length
        ? [
            { to: '/account/showcase', label: 'نمونه‌کار و نظرها', icon: 'star' },
            { to: '/account/promotions', label: 'پیشنهادهای ویژه', icon: 'campaign' },
            { to: '/account/placements', label: 'معرفی ویژه', icon: 'auto_awesome_motion' },
          ]
        : [],
    },
    {
      title: 'آموزش و کار',
      tools: [
        { to: '/account/learning', label: 'آموزش‌های من', icon: 'school' },
        { to: '/account/resume', label: 'رزومه و درخواست‌ها', icon: 'badge' },
        ...(profiles.value.length
          ? [
              { to: '/account/courses', label: 'دوره‌های من', icon: 'cast_for_education' },
              { to: '/account/jobs', label: 'آگهی‌های استخدام', icon: 'work' },
            ]
          : []),
      ],
    },
    {
      title: 'حساب',
      tools: [{ to: '/account/billing', label: 'اشتراک و صورت‌حساب', icon: 'receipt_long' }],
    },
  ].filter((group) => group.tools.length),
);
const draft = reactive<{
  description: string;
  city: string;
  website: string;
  public_phone: string;
  specialties: string;
  services: string;
  social_links: Record<string, string>;
}>({
  description: '',
  city: '',
  website: '',
  public_phone: '',
  specialties: '',
  services: '',
  social_links: {},
});

async function authenticate(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    const result =
      mode.value === 'login'
        ? await login(credentials.email, credentials.password)
        : await register(credentials.name, credentials.email, credentials.password);
    auth.signIn(result.token, result.user);
    credentials.password = '';
    const redirect = route.query.redirect;
    if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')) {
      await router.replace(redirect);
      return;
    }
    await loadDashboard();
  } catch (exception) {
    error.value = exception instanceof ApiError ? firstError(exception) : 'اتصال برقرار نشد.';
  } finally {
    busy.value = false;
  }
}

function firstError(exception: ApiError): string {
  const first = Object.values(exception.errors)[0]?.[0];
  return first ?? exception.message;
}

async function loadDashboard(): Promise<void> {
  if (!auth.loggedIn) return;
  const [owned, claimList, changeList] = await Promise.all([
    myProfiles().catch(() => []),
    myClaims().catch(() => []),
    myChangeRequests().catch(() => []),
  ]);
  profiles.value = owned;
  claims.value = claimList;
  changes.value = changeList;
}

async function loadClaimTarget(): Promise<void> {
  claimTarget.value = claimSlug.value ? await getActor(claimSlug.value).catch(() => null) : null;
}

async function submitClaim(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    await claimProfile(claimSlug.value, claimReason.value);
    message.value =
      'درخواست مالکیت ثبت شد. پس از بررسی مدارک، نتیجه در همین صفحه نمایش داده می‌شود.';
    claimReason.value = '';
    await router.replace({ path: '/account' });
    await loadDashboard();
  } catch (exception) {
    error.value = exception instanceof ApiError ? firstError(exception) : 'ثبت درخواست ممکن نشد.';
  } finally {
    busy.value = false;
  }
}

function startEditing(profile: OwnedProfile): void {
  editing.value = profile.slug;
  message.value = '';
  error.value = '';
  draft.description = profile.editable.description ?? '';
  draft.city = profile.editable.city ?? '';
  draft.website = profile.editable.website ?? '';
  draft.public_phone = profile.editable.public_phone ?? '';
  draft.specialties = (profile.editable.specialties ?? []).join('، ');
  draft.services = (profile.editable.services ?? []).join('، ');
  draft.social_links = Object.fromEntries(
    Object.keys(socialNetworks).map((key) => [key, profile.editable.social_links?.[key] ?? '']),
  );
}
const splitList = (value: string) =>
  value
    .split(/[،,]/)
    .map((item) => item.trim())
    .filter(Boolean);

async function submitChange(profile: OwnedProfile): Promise<void> {
  const proposed: Partial<EditableFields> = {
    description: draft.description.trim() || null,
    city: draft.city.trim() || null,
    website: draft.website.trim() || null,
    public_phone: draft.public_phone.trim() || null,
    specialties: splitList(draft.specialties),
    services: splitList(draft.services),
    social_links: Object.fromEntries(
      Object.entries(draft.social_links)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value),
    ),
  };
  if (!Object.keys(proposed.social_links ?? {}).length) proposed.social_links = null;
  const changed = Object.fromEntries(
    Object.entries(proposed).filter(
      ([key, value]) =>
        JSON.stringify(value) !==
        JSON.stringify(
          profile.editable[key as keyof EditableFields] ??
            (key === 'specialties' || key === 'services' ? [] : null),
        ),
    ),
  );
  if (!Object.keys(changed).length) {
    error.value = 'تغییری نسبت به اطلاعات فعلی وارد نکرده‌اید.';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await requestChange(profile.slug, changed);
    editing.value = '';
    message.value = 'پیشنهاد اصلاح ثبت شد و پس از بازبینی اپراتور روی پروفایل منتشر می‌شود.';
    await loadDashboard();
  } catch (exception) {
    error.value = exception instanceof ApiError ? firstError(exception) : 'ثبت پیشنهاد ممکن نشد.';
  } finally {
    busy.value = false;
  }
}

async function signOut(): Promise<void> {
  await auth.signOut();
  void router.push('/');
}

function statusClass(status: string): string {
  return status === 'approved'
    ? 'badge--verified'
    : status === 'pending'
      ? 'badge--amber'
      : 'badge--neutral';
}

watch(claimSlug, () => void loadClaimTarget());
onMounted(async () => {
  await auth.restore();
  await Promise.all([loadClaimTarget(), loadDashboard()]);
});
</script>

<template>
  <SiteHeader />
  <main class="container account-page">
    <!-- Signed out -->
    <div v-if="auth.ready && !auth.loggedIn" class="auth-card">
      <div class="eyebrow">{{ claimSlug ? 'مطالبهٔ پروفایل' : 'حساب کاربری' }}</div>
      <h1>{{ mode === 'login' ? 'ورود به اینشورهاب' : 'ساخت حساب' }}</h1>
      <p v-if="claimTarget">برای مطالبهٔ پروفایل «{{ claimTarget.name }}» ابتدا وارد شوید.</p>
      <p v-else-if="route.query.intent === 'claim'">
        وارد شوید، سپس پروفایل خود را در جست‌وجو پیدا کنید و «مطالبهٔ پروفایل» را بزنید.
      </p>
      <p v-else>برای مطالبه و تکمیل پروفایل حرفه‌ای خود وارد شوید.</p>
      <div class="segmented" role="tablist">
        <button role="tab" :class="{ active: mode === 'login' }" @click="mode = 'login'">
          ورود
        </button>
        <button role="tab" :class="{ active: mode === 'register' }" @click="mode = 'register'">
          ثبت‌نام
        </button>
      </div>
      <form @submit.prevent="authenticate">
        <label v-if="mode === 'register'" class="field-label">
          نام و نام خانوادگی
          <input v-model="credentials.name" class="input" required autocomplete="name" />
        </label>
        <label class="field-label">
          ایمیل
          <input
            v-model="credentials.email"
            class="input"
            type="email"
            dir="ltr"
            required
            autocomplete="email"
          />
        </label>
        <label class="field-label">
          رمز عبور
          <input
            v-model="credentials.password"
            class="input"
            type="password"
            dir="ltr"
            required
            :minlength="mode === 'register' ? 10 : 1"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
          />
        </label>
        <button class="btn btn--primary btn--block" :disabled="busy">
          {{ busy ? 'لطفاً صبر کنید…' : mode === 'login' ? 'ورود' : 'ایجاد حساب' }}
        </button>
      </form>
      <div v-if="error" class="notice notice--error">{{ error }}</div>
    </div>

    <!-- Claim form -->
    <div v-else-if="auth.loggedIn && claimSlug" class="auth-card">
      <div class="eyebrow">مطالبهٔ پروفایل</div>
      <h1>{{ claimTarget?.name ?? 'پروفایل' }}</h1>
      <p>
        نسبت خود با این پروفایل و راه بررسی آن را توضیح دهید. ثبت درخواست به معنی تأیید خودکار نیست؛
        اپراتور ممکن است مدرک تکمیلی بخواهد.
      </p>
      <form @submit.prevent="submitClaim">
        <label class="field-label">
          نسبت شما با این پروفایل
          <textarea
            v-model="claimReason"
            class="textarea"
            minlength="20"
            maxlength="2000"
            required
            placeholder="مثلاً: مدیرعامل این کارگزاری هستم؛ شماره پروانه و روزنامه رسمی قابل ارائه است."
          />
        </label>
        <button class="btn btn--amber btn--block" :disabled="busy">ثبت درخواست بررسی</button>
      </form>
      <div v-if="error" class="notice notice--error">{{ error }}</div>
    </div>

    <!-- Dashboard -->
    <template v-else-if="auth.loggedIn">
      <div class="dashboard-head">
        <div>
          <div class="eyebrow">پیشخوان</div>
          <h1>سلام {{ auth.user?.name }}</h1>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap">
          <router-link to="/requests" class="btn btn--primary">
            <q-icon name="request_quote" size="18px" />استعلام‌های من
          </router-link>
          <button class="btn btn--outline" @click="signOut">
            <q-icon name="logout" size="18px" />خروج
          </button>
        </div>
      </div>
      <nav class="account-tools" aria-label="ابزارها">
        <section v-for="group in toolGroups" :key="group.title">
          <h2>{{ group.title }}</h2>
          <router-link
            v-for="tool in group.tools"
            :key="tool.to"
            :to="tool.to"
            class="account-tool"
          >
            <q-icon :name="tool.icon" size="20px" />{{ tool.label }}
          </router-link>
        </section>
      </nav>
      <div v-if="message" class="notice" style="margin: 0 0 16px">{{ message }}</div>

      <div class="dashboard-grid">
        <section class="card">
          <h2><q-icon name="badge" />پروفایل‌های من</h2>
          <div v-if="!profiles.length" class="state" style="padding: 32px 16px">
            <q-icon name="add_business" />
            هنوز پروفایلی به حساب شما واگذار نشده است.
            <div style="margin-top: 12px">
              <router-link to="/search" class="btn btn--amber"
                >پروفایل خود را پیدا کنید</router-link
              >
            </div>
          </div>
          <div v-for="profile in profiles" :key="profile.slug" class="owned">
            <div class="owned__head">
              <span class="tile" :class="`tone-${actorTypes[profile.type].tone}`"
                ><q-icon :name="actorTypes[profile.type].icon"
              /></span>
              <div>
                <b>{{ profile.name }}</b>
                <div style="font-size: 13px; color: var(--muted)">
                  {{ actorTypes[profile.type].label }}
                </div>
              </div>
              <router-link :to="`/profiles/${profile.slug}`" class="btn btn--ghost"
                >مشاهده</router-link
              >
              <button
                v-if="editing !== profile.slug"
                class="btn btn--outline"
                :disabled="profile.pending_changes > 0"
                @click="startEditing(profile)"
              >
                ویرایش
              </button>
            </div>
            <div class="owned__stats">
              <span
                ><b>{{ faNumber(profile.views_30d) }}</b> بازدید در ۳۰ روز</span
              >
              <span v-for="(count, channel) in profile.channels_30d" :key="channel" class="chip">
                {{ referralChannels[channel] ?? channel }}: {{ faNumber(count) }}
              </span>
              <router-link :to="`/profiles/${profile.slug}/card`" class="link"
                >کارت ویزیت و پیوند اشتراک</router-link
              >
              <span v-if="profile.pending_changes" class="badge badge--amber"
                >پیشنهاد اصلاح در انتظار بررسی</span
              >
              <span v-if="!profile.published" class="badge badge--neutral">منتشرنشده</span>
            </div>

            <form
              v-if="editing === profile.slug"
              class="edit-grid"
              @submit.prevent="submitChange(profile)"
            >
              <p class="span-2 notice notice--info" style="margin: 0 0 14px">
                نام، نوع، مجوز و وابستگی را فقط اپراتور تغییر می‌دهد. برای اصلاح آن‌ها از «گزارش
                خطا» استفاده کنید.
              </p>
              <label class="field-label span-2">
                معرفی
                <textarea v-model="draft.description" class="textarea" maxlength="3000" />
              </label>
              <label class="field-label">
                شهر
                <input v-model="draft.city" class="input" maxlength="100" />
              </label>
              <label class="field-label">
                تلفن عمومی
                <input v-model="draft.public_phone" class="input" dir="ltr" inputmode="tel" />
              </label>
              <label class="field-label">
                وب‌سایت
                <input
                  v-model="draft.website"
                  class="input"
                  dir="ltr"
                  type="url"
                  placeholder="https://"
                />
              </label>
              <label class="field-label">
                تخصص‌ها (با ویرگول جدا کنید)
                <input v-model="draft.specialties" class="input" />
              </label>
              <label class="field-label span-2">
                خدمات شما (با ویرگول جدا کنید؛ مثلاً مشاورهٔ رایگان، پیگیری خسارت)
                <input v-model="draft.services" class="input" />
              </label>
              <label v-for="(network, key) in socialNetworks" :key="key" class="field-label">
                {{ network.label }}
                <input
                  v-model="draft.social_links[key]"
                  class="input"
                  dir="ltr"
                  placeholder="@handle یا نشانی کامل"
                />
              </label>
              <div class="span-2 dialog-actions">
                <button type="button" class="btn btn--ghost" @click="editing = ''">انصراف</button>
                <button class="btn btn--primary" :disabled="busy">ارسال برای بازبینی</button>
              </div>
              <div v-if="error" class="span-2 notice notice--error">{{ error }}</div>
            </form>
          </div>
        </section>

        <aside>
          <section class="card">
            <h2><q-icon name="assignment_ind" />درخواست‌های مالکیت</h2>
            <p v-if="!claims.length">درخواستی ثبت نکرده‌اید.</p>
            <div v-for="item in claims" :key="item.id" class="review-item">
              <div>
                <router-link v-if="item.slug" :to="`/profiles/${item.slug}`" class="link">{{
                  item.actor
                }}</router-link>
                <small
                  >{{ faDate(item.created_at)
                  }}<template v-if="item.decision_note">
                    · {{ item.decision_note }}</template
                  ></small
                >
              </div>
              <span class="badge" :class="statusClass(item.status)">{{
                statusLabels[item.status]
              }}</span>
            </div>
          </section>
          <section class="card">
            <h2><q-icon name="history" />پیشنهادهای اصلاح</h2>
            <p v-if="!changes.length">پیشنهادی ثبت نکرده‌اید.</p>
            <div v-for="item in changes" :key="item.id" class="review-item">
              <div>
                {{ item.actor }}
                <small>
                  {{ item.fields?.map((field) => fieldLabels[field] ?? field).join('، ') }} ·
                  {{ faDate(item.created_at) }}
                  <template v-if="item.decision_note"> · {{ item.decision_note }}</template>
                </small>
              </div>
              <span class="badge" :class="statusClass(item.status)">{{
                statusLabels[item.status]
              }}</span>
            </div>
          </section>
        </aside>
      </div>
    </template>

    <div v-else class="skeleton" style="max-width: 440px; height: 320px; margin: 24px auto" />
  </main>
  <SiteFooter />
</template>
