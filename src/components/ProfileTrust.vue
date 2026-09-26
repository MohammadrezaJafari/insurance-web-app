<script setup lang="ts">
import { faDate, faNumber } from '../format';
import type { ProfessionalScore, PublicReview } from '../types';
import StarRating from './StarRating.vue';

/** Professional score with its breakdown, and published client reviews. */
defineProps<{ score: ProfessionalScore; reviews: PublicReview[] }>();
const axes = { speed: 'سرعت پاسخ', expertise: 'تخصص', service: 'خدمات پس از فروش' } as const;
</script>

<template>
  <section class="card">
    <h2><q-icon name="workspace_premium" />امتیاز حرفه‌ای</h2>
    <div class="score">
      <b>{{ score.score === null ? '—' : faNumber(score.score) }}</b>
      <span>{{ score.score === null ? 'دادهٔ کافی برای امتیاز نیست' : 'از ۱۰۰' }}</span>
    </div>
    <ul class="score__parts">
      <li v-for="part in score.components" :key="part.key" :class="{ muted: part.value === null }">
        <div class="kv" style="border: 0; padding: 0">
          <b>{{ part.label }}</b>
          <small>وزن {{ faNumber(part.weight) }}</small>
        </div>
        <div class="meter" :class="{ 'meter--success': (part.value ?? 0) >= 0.7 }">
          <span :style="{ width: `${(part.value ?? 0) * 100}%` }" />
        </div>
        <small class="muted-text">{{ part.detail ?? 'دادهٔ کافی نیست' }}</small>
      </li>
    </ul>
    <p v-if="score.complaints_upheld" class="notice notice--error" style="margin: 10px 0 0">
      {{ faNumber(score.complaints_upheld) }} شکایت واردشده در یک سال اخیر؛ هر مورد از امتیاز کم
      می‌کند.
    </p>
    <p class="card__note">
      امتیاز از نشان‌های تأیید، نرخ و سرعت پاسخ، انتخاب پیشنهاد و رضایت مشتریانی که از همین مسیر
      خرید کرده‌اند ساخته می‌شود؛ بخشی که داده ندارد در محاسبه نمی‌آید.
      <router-link to="/verification" class="link">روش محاسبه</router-link>
    </p>
  </section>

  <section v-if="score.reviews.shown" class="card">
    <h2><q-icon name="reviews" />نظر مشتریان ({{ faNumber(score.reviews.count) }})</h2>
    <div class="score score--small">
      <b>{{ faNumber(score.reviews.average ?? 0) }}</b>
      <StarRating :value="score.reviews.average" label="میانگین" />
    </div>
    <div v-for="(label, axis) in axes" :key="axis" class="kv" style="padding: 4px 0">
      <b>{{ label }}</b>
      <StarRating :value="score.reviews.axes[axis]" :label="label" />
    </div>
    <article v-for="review in reviews" :key="review.id" class="review">
      <header>
        <StarRating :value="review.average" label="امتیاز" />
        <small class="muted-text">
          {{ review.author }} · {{ review.line }} · {{ faDate(review.published_at) }}
        </small>
      </header>
      <p v-if="review.comment" class="pre">{{ review.comment }}</p>
      <blockquote v-if="review.reply" class="review__reply">
        <b>پاسخ ارائه‌دهنده:</b> {{ review.reply }}
      </blockquote>
    </article>
    <p class="card__note">
      فقط بیمه‌گذارانی که پیشنهاد این ارائه‌دهنده را در اینشورهاب انتخاب کرده‌اند می‌توانند نظر
      بدهند؛ نظرها پیش از انتشار بررسی می‌شوند.
    </p>
  </section>
</template>
