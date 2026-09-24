<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { markNotificationsRead, notifications } from '../api';
import { faDateTime } from '../format';
import type { NotificationItem } from '../types';

const router = useRouter();
const items = ref<NotificationItem[]>([]);
const unread = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

async function refresh(): Promise<void> {
  try {
    const result = await notifications();
    items.value = result.data;
    unread.value = result.unread;
  } catch {
    // The bell is best-effort; a failed poll simply keeps the last state.
  }
}
async function openItem(item: NotificationItem): Promise<void> {
  if (!item.read) {
    unread.value = (await markNotificationsRead([item.id])).unread;
    item.read = true;
  }
  await router.push(item.path);
}
async function readAll(): Promise<void> {
  unread.value = (await markNotificationsRead()).unread;
  items.value.forEach((item) => (item.read = true));
}

onMounted(() => {
  void refresh();
  timer = setInterval(() => {
    if (document.visibilityState === 'visible') void refresh();
  }, 60_000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <button
    class="btn btn--ghost bell"
    :aria-label="`اعلان‌ها${unread ? `، ${unread} خوانده‌نشده` : ''}`"
  >
    <q-icon name="notifications_none" size="22px" />
    <span v-if="unread" class="bell__count">{{
      unread > 9 ? '۹+' : unread.toLocaleString('fa-IR')
    }}</span>
    <q-menu anchor="bottom left" self="top left" :offset="[0, 8]" class="bell-menu" @show="refresh">
      <div class="bell-menu__head">
        <b>اعلان‌ها</b>
        <button v-if="unread" class="link-button" @click="readAll">خواندن همه</button>
      </div>
      <p v-if="!items.length" class="muted-text" style="padding: 16px">اعلانی ندارید.</p>
      <button
        v-for="item in items"
        :key="item.id"
        v-close-popup
        class="bell-item"
        :class="{ 'bell-item--unread': !item.read }"
        @click="openItem(item)"
      >
        <b>{{ item.title }}</b>
        <span>{{ item.body }}</span>
        <small>{{ faDateTime(item.created_at) }}</small>
      </button>
    </q-menu>
  </button>
</template>
