<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import {
  deleteShowcaseItem,
  myProfiles,
  myShowcase,
  receivedReviews,
  replyReview,
  saveShowcaseItem,
  withdrawShowcaseItem,
} from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useDirectoryStore } from '../stores/directory';
import { errorMessage, faDate, faNumber, itemKinds, moderationStatuses } from '../format';
import type { ProfileRef, ProfileShowcaseItem, PublicReview } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';
import StarRating from '../components/StarRating.vue';

useMeta({
  title: 'نمونه‌کار و نظرها | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const directory = useDirectoryStore();
const items = ref<ProfileShowcaseItem[] | null>(null);
const reviews = ref<PublicReview[]>([]);
const profiles = ref<ProfileRef[]>([]);
const profile = ref('');
const open = ref(false);
const editingId = ref<number | null>(null);
const busy = ref(false);
const error = ref('');
const replies = reactive<Record<number, string>>({});
const draft = reactive<Omit<ProfileShowcaseItem, 'id'>>(blank());

function blank(): Omit<ProfileShowcaseItem, 'id'> {
  return { kind: 'project', title: '', body: null, year: null, insurance_line: null, url: null };
}
async function load(): Promise<void> {
  const [showcase, received] = await Promise.all([myShowcase(), receivedReviews()]);
  items.value = showcase.data;
  reviews.value = received;
}
function edit(item: ProfileShowcaseItem | null): void {
  editingId.value = item?.id ?? null;
  Object.assign(
    draft,
    item
      ? {
          kind: item.kind,
          title: item.title,
          body: item.body,
          year: item.year,
          insurance_line: item.insurance_line,
          url: item.url,
        }
      : blank(),
  );
  if (item?.profile) profile.value = item.profile.slug;
  error.value = '';
  open.value = true;
}
async function save(): Promise<void> {
  busy.value = true;
  error.value = '';
  try {
    await saveShowcaseItem(profile.value, draft, editingId.value ?? undefined);
    open.value = false;
    await load();
  } catch (exception) {
    error.value = errorMessage(exception, 'ثبت ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
async function act(item: ProfileShowcaseItem, action: 'withdraw' | 'delete'): Promise<void> {
  if (action === 'delete' && !window.confirm('این مورد حذف شود؟')) return;
  await (action === 'delete' ? deleteShowcaseItem(item.id) : withdrawShowcaseItem(item.id));
  await load();
}
async function reply(review: PublicReview): Promise<void> {
  try {
    await replyReview(review.id, replies[review.id] ?? '');
    await load();
  } catch (exception) {
    error.value = errorMessage(exception);
  }
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  profiles.value = (await myProfiles()).map(({ name, slug }) => ({ name, slug }));
  profile.value = profiles.value[0]?.slug ?? '';
  await Promise.all([load(), directory.loadTaxonomy().catch(() => undefined)]);
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">صاحب پروفایل</div>
        <h1>نمونه‌کار و نظرهای مشتریان</h1>
      </div>
      <button class="btn btn--primary" :disabled="!profiles.length" @click="edit(null)">
        <q-icon name="add" size="18px" />مورد جدید
      </button>
    </div>
    <div v-if="error && !open" class="notice notice--error">{{ error }}</div>

    <div class="profile-grid">
      <section class="card">
        <h2><q-icon name="work_history" />پروژه‌ها، دستاوردها و محتوا</h2>
        <p class="muted-text">
          هر مورد پیش از انتشار بررسی می‌شود و با برچسب «اظهار صاحب پروفایل» نمایش داده می‌شود.
          اطلاعات محرمانهٔ مشتری را بدون رضایت او منتشر نکنید.
        </p>
        <div v-if="!items" class="skeleton" style="height: 120px" />
        <p v-else-if="!items.length" class="muted-text">هنوز موردی ثبت نکرده‌اید.</p>
        <div v-for="item in items" :key="item.id" class="showcase-item">
          <span class="tile tile--sm tone-teal"><q-icon :name="itemKinds[item.kind]?.icon" /></span>
          <div style="flex: 1">
            <b>{{ item.title }}</b>
            <small class="muted-text">
              {{ itemKinds[item.kind]?.label }} · {{ item.profile?.name }}
              <template v-if="item.year"> · {{ faNumber(String(item.year)) }}</template>
            </small>
            <small v-if="item.review_note" class="muted-text" style="display: block">
              {{ item.review_note }}
            </small>
          </div>
          <StatusBadge :status="moderationStatuses[item.status ?? 'draft']" />
          <button
            v-if="['draft', 'rejected', 'withdrawn'].includes(item.status ?? '')"
            class="btn btn--ghost"
            @click="edit(item)"
          >
            ویرایش
          </button>
          <button
            v-if="['pending', 'published'].includes(item.status ?? '')"
            class="btn btn--ghost"
            @click="act(item, 'withdraw')"
          >
            پس گرفتن
          </button>
          <button class="btn btn--ghost" aria-label="حذف" @click="act(item, 'delete')">
            <q-icon name="delete" />
          </button>
        </div>
      </section>

      <aside>
        <section class="card">
          <h2><q-icon name="reviews" />نظرهای منتشرشده</h2>
          <p v-if="!reviews.length" class="muted-text">هنوز نظری منتشر نشده است.</p>
          <article v-for="review in reviews" :key="review.id" class="review">
            <header>
              <StarRating :value="review.average" label="امتیاز" />
              <small class="muted-text"
                >{{ review.author }} · {{ faDate(review.published_at) }}</small
              >
            </header>
            <p v-if="review.comment" class="pre">{{ review.comment }}</p>
            <blockquote v-if="review.reply" class="review__reply">{{ review.reply }}</blockquote>
            <form v-else class="thread__form" @submit.prevent="reply(review)">
              <input
                v-model="replies[review.id]"
                class="input"
                minlength="10"
                maxlength="1500"
                placeholder="پاسخ شما (یک بار، عمومی)"
                aria-label="پاسخ"
              />
              <button class="btn btn--outline" :disabled="(replies[review.id] ?? '').length < 10">
                ارسال
              </button>
            </form>
          </article>
        </section>
      </aside>
    </div>

    <q-dialog v-model="open">
      <form class="dialog-card" @submit.prevent="save">
        <h2>{{ editingId ? 'ویرایش' : 'مورد جدید' }}</h2>
        <label v-if="!editingId && profiles.length > 1" class="field-label">
          پروفایل
          <select v-model="profile" class="select">
            <option v-for="item in profiles" :key="item.slug" :value="item.slug">
              {{ item.name }}
            </option>
          </select>
        </label>
        <div class="form-row">
          <label class="field-label">
            نوع
            <select v-model="draft.kind" class="select">
              <option v-for="(kind, key) in itemKinds" :key="key" :value="key">
                {{ kind.label }}
              </option>
            </select>
          </label>
          <label class="field-label">
            سال (شمسی)
            <input
              v-model.number="draft.year"
              class="input"
              type="number"
              min="1300"
              max="1500"
              dir="ltr"
            />
          </label>
        </div>
        <label class="field-label">
          عنوان<input v-model="draft.title" class="input" required minlength="4" maxlength="160" />
        </label>
        <label class="field-label">
          شرح<textarea v-model="draft.body" class="textarea" maxlength="3000" />
        </label>
        <div class="form-row">
          <label class="field-label">
            رشته
            <select v-model="draft.insurance_line" class="select">
              <option :value="null">—</option>
              <option v-for="line in directory.taxonomy?.insurance_lines ?? []" :key="line">
                {{ line }}
              </option>
            </select>
          </label>
          <label class="field-label">
            پیوند (اختیاری)<input v-model="draft.url" class="input" type="url" dir="ltr" />
          </label>
        </div>
        <div v-if="error" class="notice notice--error">{{ error }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="open = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ارسال برای بررسی</button>
        </div>
      </form>
    </q-dialog>
  </main>
  <SiteFooter />
</template>
