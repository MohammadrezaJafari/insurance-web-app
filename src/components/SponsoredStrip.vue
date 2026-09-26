<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { clickSponsored, sponsored } from '../api';
import { actorTypes } from '../format';
import type { SponsoredCard } from '../types';

/** Paid introductions, always labelled; shown only when they match what the visitor filters on. */
const props = defineProps<{
  placement: 'search' | 'home' | 'offers';
  line?: string | undefined;
  province?: string | undefined;
  type?: string | undefined;
}>();
const router = useRouter();
const cards = ref<SponsoredCard[]>([]);

async function load(): Promise<void> {
  cards.value = await sponsored(props.placement, {
    line: props.line,
    province: props.province,
    type: props.type,
  }).catch(() => []);
}
async function open(card: SponsoredCard): Promise<void> {
  await clickSponsored(card.id).catch(() => undefined);
  await router.push(`/profiles/${card.provider.slug}`);
}

watch(() => [props.line, props.province, props.type], load, { immediate: true });
</script>

<template>
  <div v-if="cards.length" class="sponsored" aria-label="معرفی ویژه">
    <button
      v-for="card in cards"
      :key="card.id"
      type="button"
      class="sponsored__card"
      @click="open(card)"
    >
      <span class="sponsored__label">معرفی ویژه</span>
      <span class="tile tile--sm" :class="`tone-${actorTypes[card.provider.type].tone}`">
        <q-icon :name="actorTypes[card.provider.type].icon" />
      </span>
      <span class="sponsored__body">
        <b>{{ card.provider.name }}</b>
        <span>{{ card.headline }}</span>
        <small>
          {{ actorTypes[card.provider.type].label }}
          <template v-if="card.provider.province"> · {{ card.provider.province }}</template>
          <template v-if="card.provider.license_verified"> · مجوز بررسی‌شده</template>
        </small>
      </span>
    </button>
  </div>
</template>
