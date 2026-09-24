<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { listFilterKeys, useDirectoryStore } from '../stores/directory';
import { actorTypes, faNumber } from '../format';
import type { ActorType } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import ActorRow from '../components/ActorRow.vue';

defineOptions({
  preFetch({ store, currentRoute }) {
    const directory = useDirectoryStore(store);
    return Promise.all([
      directory.loadList(currentRoute.query),
      directory.loadTaxonomy(),
      directory.loadStats(),
    ]).then(
      () => undefined,
      () => undefined,
    );
  },
});

const route = useRoute();
const router = useRouter();
const directory = useDirectoryStore();
const loading = ref(false);
const error = ref('');
const filters = reactive({ province: '', line: '', specialty: '', verified: false });
const data = computed(() => directory.list);
const taxonomy = computed(() => directory.taxonomy);
const currentType = computed(() => String(route.query.type ?? ''));
const types = Object.entries(actorTypes) as [ActorType, (typeof actorTypes)[ActorType]][];

const heading = computed(() => {
  const type = currentType.value as ActorType;
  const base = actorTypes[type]?.plural ?? 'بازیگران صنعت بیمه';
  return route.query.q ? `نتایج «${String(route.query.q)}»` : base;
});
const activeChips = computed(() =>
  (['q', 'province', 'line', 'specialty', 'verified'] as const)
    .filter((key) => route.query[key])
    .map((key) => ({
      key,
      label: key === 'verified' ? 'فقط دارای نشان' : String(route.query[key]),
    })),
);

useMeta(() => ({
  title: `${heading.value} | اینشورهاب`,
  meta: {
    robots: {
      name: 'robots',
      content: route.query.q || route.query.page ? 'noindex, follow' : 'index, follow',
    },
  },
}));

function syncFromRoute(): void {
  filters.province = String(route.query.province ?? '');
  filters.line = String(route.query.line ?? '');
  filters.specialty = String(route.query.specialty ?? '');
  filters.verified = route.query.verified === '1';
}
function push(patch: Record<string, string | undefined>): void {
  const query: Record<string, string> = {};
  for (const key of listFilterKeys) {
    const value = key in patch ? patch[key] : (route.query[key] as string | undefined);
    if (value) query[key] = value;
  }
  if (!('page' in patch)) delete query.page;
  void router.push({ path: '/search', query });
}
function applyFilters(): void {
  push({
    province: filters.province || undefined,
    line: filters.line || undefined,
    specialty: filters.specialty || undefined,
    verified: filters.verified ? '1' : undefined,
  });
}
function clearFilter(key: string): void {
  push({ [key]: undefined });
}
async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([directory.loadList(route.query), directory.loadTaxonomy()]);
  } catch {
    error.value = 'دریافت فهرست ممکن نشد. دوباره تلاش کنید.';
  } finally {
    loading.value = false;
  }
}

syncFromRoute();
watch(
  () => route.query,
  () => {
    syncFromRoute();
    void load();
  },
);
onMounted(() => {
  if (!directory.list || !directory.taxonomy) void load();
  void directory.loadStats().catch(() => undefined);
});
</script>

<template>
  <SiteHeader />
  <div class="search-bar">
    <div class="container type-strip" role="tablist" aria-label="نوع بازیگر">
      <button
        role="tab"
        :aria-selected="!currentType"
        :class="{ active: !currentType }"
        @click="push({ type: undefined })"
      >
        همه<small v-if="directory.stats">{{ faNumber(directory.stats.total) }}</small>
      </button>
      <button
        v-for="[value, item] in types"
        :key="value"
        role="tab"
        :aria-selected="currentType === value"
        :class="{ active: currentType === value }"
        @click="push({ type: value })"
      >
        {{ item.plural
        }}<small v-if="directory.stats">{{ faNumber(directory.stats.by_type[value] ?? 0) }}</small>
      </button>
    </div>
  </div>
  <main class="container search-layout">
    <aside class="filter-panel" aria-label="فیلترها">
      <h3>محدود کردن نتایج</h3>
      <form @submit.prevent="applyFilters">
        <label class="field-label">
          استان
          <select v-model="filters.province" class="select">
            <option value="">همه استان‌ها</option>
            <option v-for="item in taxonomy?.provinces" :key="item">{{ item }}</option>
          </select>
        </label>
        <label class="field-label">
          رشتهٔ بیمه
          <select v-model="filters.line" class="select">
            <option value="">همه رشته‌ها</option>
            <option v-for="item in taxonomy?.insurance_lines" :key="item">{{ item }}</option>
          </select>
        </label>
        <label class="field-label">
          تخصص
          <select v-model="filters.specialty" class="select">
            <option value="">همه تخصص‌ها</option>
            <option v-for="item in taxonomy?.specialties" :key="item">{{ item }}</option>
          </select>
        </label>
        <label class="check">
          <input v-model="filters.verified" type="checkbox" />
          فقط پروفایل‌های دارای نشان بررسی
        </label>
        <button class="btn btn--primary btn--block">اعمال فیلتر</button>
      </form>
    </aside>

    <section aria-live="polite">
      <div class="results-head">
        <div>
          <h1>{{ heading }}</h1>
          <span v-if="data">{{ faNumber(data.meta.total) }} پروفایل یافت شد</span>
        </div>
        <div v-if="activeChips.length" class="active-filters">
          <button
            v-for="chip in activeChips"
            :key="chip.key"
            :aria-label="`حذف فیلتر ${chip.label}`"
            @click="clearFilter(chip.key)"
          >
            <q-icon name="close" size="14px" />{{ chip.label }}
          </button>
        </div>
      </div>

      <div v-if="loading && !data" class="result-list">
        <div v-for="n in 4" :key="n" class="skeleton" />
      </div>
      <div v-else-if="error" class="state state--error">
        {{ error }}
        <button class="btn btn--outline" style="margin-inline-start: 8px" @click="load">
          تلاش دوباره
        </button>
      </div>
      <div
        v-else-if="data?.data.length"
        class="result-list"
        :style="{ opacity: loading ? 0.6 : 1 }"
      >
        <ActorRow v-for="actor in data.data" :key="actor.slug" :actor="actor" />
      </div>
      <div v-else class="state">
        <q-icon name="travel_explore" />
        پروفایلی با این معیارها پیدا نشد. عبارت یا فیلترها را تغییر دهید.
      </div>

      <nav v-if="data && data.meta.last_page > 1" class="pagination" aria-label="صفحه‌بندی">
        <button
          class="btn btn--outline"
          :disabled="data.meta.current_page <= 1"
          @click="push({ page: String(data.meta.current_page - 1) })"
        >
          قبلی
        </button>
        <span
          >صفحه {{ faNumber(data.meta.current_page) }} از {{ faNumber(data.meta.last_page) }}</span
        >
        <button
          class="btn btn--outline"
          :disabled="data.meta.current_page >= data.meta.last_page"
          @click="push({ page: String(data.meta.current_page + 1) })"
        >
          بعدی
        </button>
      </nav>
    </section>
  </main>
  <SiteFooter />
</template>
