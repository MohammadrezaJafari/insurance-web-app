<script setup lang="ts">
defineProps<{ status: { label: string; tone: string } | undefined }>();
</script>

<template>
  <span class="badge" :class="`badge--${status?.tone ?? 'neutral'}`">{{
    status?.label ?? '—'
  }}</span>
</template>
