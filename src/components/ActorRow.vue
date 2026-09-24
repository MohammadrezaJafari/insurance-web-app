<script setup lang="ts">
import { actorTypes } from '../format';
import type { Actor } from '../types';

defineProps<{ actor: Actor }>();
</script>

<template>
  <router-link :to="`/profiles/${actor.slug}`" class="actor-row">
    <span class="tile" :class="`tone-${actorTypes[actor.type].tone}`">
      <q-icon :name="actorTypes[actor.type].icon" />
    </span>
    <div class="actor-row__body">
      <div class="actor-row__title">
        <h3>{{ actor.name }}</h3>
        <span v-if="actor.license_verified" class="badge badge--verified">
          <q-icon name="verified" size="14px" />مجوز بررسی‌شده
        </span>
        <span v-if="actor.identity_verified" class="badge badge--brand">
          <q-icon name="how_to_reg" size="14px" />صاحب پروفایل تأییدشده
        </span>
      </div>
      <div class="actor-row__meta">
        {{ actorTypes[actor.type].label }}
        <template v-if="actor.province"> · {{ actor.city || actor.province }}</template>
      </div>
      <p v-if="actor.description" class="actor-row__desc">{{ actor.description }}</p>
      <div v-if="actor.insurance_lines.length" class="chips">
        <span v-for="line in actor.insurance_lines.slice(0, 4)" :key="line" class="chip">{{
          line
        }}</span>
        <span v-if="actor.insurance_lines.length > 4" class="chip"
          >+{{ actor.insurance_lines.length - 4 }}</span
        >
      </div>
    </div>
    <q-icon name="chevron_left" size="24px" class="actor-row__arrow" />
  </router-link>
</template>
