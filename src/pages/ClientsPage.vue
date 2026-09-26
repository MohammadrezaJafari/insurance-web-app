<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { createClient, exportClients, importClients, listClients } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { errorMessage, faDate, faMoneyShort, faNumber } from '../format';
import type { Client, ClientDraft, ClientMeta } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import CrmNav from '../components/CrmNav.vue';
import ClientForm from '../components/ClientForm.vue';
import CsvImportDialog from '../components/CsvImportDialog.vue';

useMeta({ title: 'مشتریان | اینشورهاب', meta: { robots: { name: 'robots', content: 'noindex' } } });

const route = useRoute();
const router = useRouter();
const requireAuth = useRequireAuth();
const items = ref<Client[] | null>(null);
const meta = ref<ClientMeta | null>(null);
const error = ref('');
const search = ref(String(route.query.q ?? ''));
const tag = ref(String(route.query.tag ?? ''));
const creating = ref(false);
const importing = ref(false);
const busy = ref(false);
const formError = ref('');
const profile = ref('');
const draft = reactive<ClientDraft>({
  kind: 'person',
  name: '',
  national_id: null,
  phone: null,
  email: null,
  province: null,
  city: null,
  tags: [],
  notes: null,
});
const multipleProfiles = computed(() => (meta.value?.profiles.length ?? 0) > 1);

async function load(): Promise<void> {
  const params = new URLSearchParams();
  if (search.value.trim()) params.set('q', search.value.trim());
  if (tag.value) params.set('tag', tag.value);
  try {
    const result = await listClients(params);
    items.value = result.data;
    meta.value = result.meta;
    profile.value ||= result.meta.profiles[0]?.slug ?? '';
  } catch {
    error.value = 'دریافت مشتریان ممکن نشد.';
  }
}
function applyFilters(): void {
  void router.replace({
    query: { q: search.value.trim() || undefined, tag: tag.value || undefined },
  });
}
async function create(): Promise<void> {
  busy.value = true;
  formError.value = '';
  try {
    const created = await createClient(profile.value, draft);
    await router.push(`/crm/clients/${created.id}`);
  } catch (exception) {
    formError.value = errorMessage(exception, 'ثبت ممکن نشد.');
  } finally {
    busy.value = false;
  }
}
async function runExport(): Promise<void> {
  try {
    await exportClients();
  } catch {
    error.value = 'دریافت خروجی ممکن نشد.';
  }
}

watch(
  () => route.query,
  () => void load(),
);
onMounted(async () => {
  if (await requireAuth()) await load();
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">مدیریت کسب‌وکار</div>
        <h1>مشتریان</h1>
      </div>
      <div class="stack-row">
        <button
          class="btn btn--outline"
          :disabled="!meta?.profiles.length"
          @click="importing = true"
        >
          <q-icon name="upload" size="18px" />ورود از فایل
        </button>
        <button class="btn btn--outline" :disabled="!items?.length" @click="runExport">
          <q-icon name="download" size="18px" />خروجی CSV
        </button>
        <button
          class="btn btn--primary"
          :disabled="!meta?.profiles.length"
          @click="creating = true"
        >
          <q-icon name="person_add" size="18px" />مشتری جدید
        </button>
      </div>
    </div>
    <CrmNav />

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!items || !meta" class="skeleton" style="height: 320px" />
    <div v-else-if="!meta.profiles.length" class="state">
      <q-icon name="badge" />
      مدیریت مشتری برای صاحبان پروفایل کارگزار یا نماینده فعال است.
      <div style="margin-top: 14px">
        <router-link to="/search" class="btn btn--amber">مطالبهٔ پروفایل</router-link>
      </div>
    </div>

    <template v-else>
      <form class="toolbar" @submit.prevent="applyFilters">
        <div class="header-search" style="max-width: 320px">
          <q-icon name="search" size="18px" />
          <input
            v-model="search"
            placeholder="نام، تلفن یا ایمیل"
            aria-label="جست‌وجو در مشتریان"
          />
        </div>
        <select
          v-if="meta.tags.length"
          v-model="tag"
          class="select"
          style="width: auto; margin: 0"
          aria-label="برچسب"
          @change="applyFilters"
        >
          <option value="">همه برچسب‌ها</option>
          <option v-for="item in meta.tags" :key="item">{{ item }}</option>
        </select>
        <span class="muted-text">{{ faNumber(meta.total) }} مشتری</span>
      </form>

      <div v-if="!items.length" class="state">
        <q-icon name="contacts" />
        {{ meta.total ? 'مشتری‌ای با این جست‌وجو پیدا نشد.' : 'هنوز مشتری‌ای ثبت نکرده‌اید.' }}
      </div>
      <div v-else class="card compare-scroll" style="padding: 0">
        <table class="compare data-table">
          <thead>
            <tr>
              <th scope="col">مشتری</th>
              <th scope="col">تماس</th>
              <th scope="col">بیمه‌نامهٔ فعال</th>
              <th scope="col">حق بیمهٔ فعال</th>
              <th scope="col">نزدیک‌ترین سررسید</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="client in items"
              :key="client.id"
              class="row-link"
              @click="router.push(`/crm/clients/${client.id}`)"
            >
              <td>
                <router-link :to="`/crm/clients/${client.id}`" class="link">{{
                  client.name
                }}</router-link>
                <div v-if="client.tags.length" class="chips" style="margin-top: 4px">
                  <span v-for="item in client.tags" :key="item" class="chip">{{ item }}</span>
                </div>
                <small v-if="multipleProfiles" class="muted-text" style="display: block">
                  {{ client.provider.name }}
                </small>
              </td>
              <td dir="ltr" style="text-align: end">{{ client.phone || client.email || '—' }}</td>
              <td>{{ faNumber(client.active_policies ?? 0) }}</td>
              <td>{{ faMoneyShort(client.active_premium) || '—' }}</td>
              <td>{{ faDate(client.next_end) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <q-dialog v-model="creating">
      <form class="dialog-card" @submit.prevent="create">
        <h2>مشتری جدید</h2>
        <p>اطلاعات مشتریان فقط برای خودتان قابل مشاهده است.</p>
        <label v-if="multipleProfiles" class="field-label">
          پروفایل
          <select v-model="profile" class="select">
            <option v-for="item in meta?.profiles" :key="item.slug" :value="item.slug">
              {{ item.name }}
            </option>
          </select>
        </label>
        <ClientForm v-model="draft" />
        <div v-if="formError" class="notice notice--error">{{ formError }}</div>
        <div class="dialog-actions">
          <button type="button" class="btn btn--ghost" @click="creating = false">انصراف</button>
          <button class="btn btn--primary" :disabled="busy">ثبت مشتری</button>
        </div>
      </form>
    </q-dialog>

    <CsvImportDialog
      v-model="importing"
      title="ورود مشتریان از CSV"
      :profiles="meta?.profiles ?? []"
      :upload="importClients"
      @imported="load"
    >
      سطر اول: نام ستون‌ها. ستون <code>name</code> الزامی است؛ ستون‌های اختیاری:
      <code>kind</code> (person/company)، <code>national_id</code>، <code>phone</code>،
      <code>email</code>، <code>province</code>، <code>city</code>، <code>tags</code> (جدا با ؛)،
      <code>notes</code>. فقط مشتریانی را وارد کنید که اجازهٔ نگهداری اطلاعاتشان را دارید.
    </CsvImportDialog>
  </main>
  <SiteFooter />
</template>
