<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import BrandMark from './BrandMark.vue';
import NotificationBell from './NotificationBell.vue';
import { useTenderMeta } from '../composables/useTenderMeta';

const props = withDefaults(defineProps<{ search?: boolean }>(), { search: true });
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const tenders = useTenderMeta();
const term = ref(String(route.query.q ?? ''));

watch(
  () => route.query.q,
  (value) => (term.value = String(value ?? '')),
);
onMounted(async () => {
  await auth.restore();
  if (auth.loggedIn) void tenders.load();
});

function submit(): void {
  void router.push({ path: '/search', query: term.value.trim() ? { q: term.value.trim() } : {} });
}
</script>

<template>
  <header class="site-header">
    <div class="container site-header__inner">
      <router-link class="brand" to="/" aria-label="اینشورهاب، صفحه اصلی">
        <BrandMark class="brand__mark" />
        <span class="brand__name">اینشورهاب</span>
      </router-link>
      <nav class="site-nav" aria-label="پیمایش اصلی">
        <router-link to="/search">جست‌وجوی بازیگران</router-link>
        <router-link to="/requests/new">ثبت استعلام</router-link>
        <router-link v-if="tenders.meta.value" to="/tenders">مناقصه‌ها</router-link>
        <router-link to="/verification">معنای نشان‌ها</router-link>
      </nav>
      <form v-if="props.search" class="header-search" role="search" @submit.prevent="submit">
        <q-icon name="search" size="20px" />
        <input
          v-model="term"
          aria-label="جست‌وجو در اینشورهاب"
          placeholder="جست‌وجو در اینشورهاب…"
        />
      </form>
      <div class="header-actions">
        <NotificationBell v-if="auth.loggedIn" />
        <router-link v-if="auth.loggedIn" to="/account" class="btn btn--ghost">
          <q-icon name="account_circle" size="20px" />{{ auth.user?.name }}
        </router-link>
        <template v-else>
          <router-link to="/account" class="btn btn--ghost">ورود</router-link>
          <router-link
            to="/account?intent=claim"
            class="btn btn--amber"
            aria-label="پروفایل خود را مطالبه کنید"
          >
            <q-icon name="add_business" size="18px" /><span>پروفایل خود را مطالبه کنید</span>
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>
