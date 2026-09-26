<script setup lang="ts">
import { actorTypes, faDate } from '../format';
import type { Offer } from '../types';

defineProps<{ offer: Offer }>();
</script>

<template>
  <router-link :to="`/offers/${offer.id}`" class="card offer-card">
    <div class="offer-card__head">
      <span class="badge" :class="offer.kind === 'festival' ? 'badge--amber' : 'badge--brand'">
        {{ offer.kind === 'festival' ? 'جشنوارهٔ شرکت بیمه' : 'پیشنهاد خدمت' }}
      </span>
      <small class="muted-text">تا {{ faDate(offer.ends_on) }}</small>
    </div>
    <h3>{{ offer.title }}</h3>
    <p v-if="offer.discount_text" class="offer-card__discount">{{ offer.discount_text }}</p>
    <div class="chips">
      <span v-for="service in offer.services.slice(0, 3)" :key="service" class="chip">
        <q-icon name="check" size="14px" />{{ service }}
      </span>
    </div>
    <footer v-if="offer.provider" class="offer-card__provider">
      <q-icon :name="actorTypes[offer.provider.type].icon" />
      {{ offer.provider.name }}
      <q-icon v-if="offer.provider.verified" name="verified" color="positive" size="16px" />
    </footer>
  </router-link>
</template>
