<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { Map as LeafletMap } from 'leaflet';

const props = defineProps<{ lat: number; lng: number; label: string }>();
const container = ref<HTMLElement | null>(null);
const failed = ref(false);
let map: LeafletMap | null = null;

// Leaflet touches `window`, so it is loaded only in the browser.
onMounted(async () => {
  try {
    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    if (!container.value) return;
    map = L.map(container.value, { scrollWheelZoom: false, attributionControl: true }).setView(
      [props.lat, props.lng],
      15,
    );
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    L.circleMarker([props.lat, props.lng], {
      radius: 9,
      color: '#1f4fd6',
      weight: 3,
      fillColor: '#3b6cf6',
      fillOpacity: 0.85,
    })
      .addTo(map)
      .bindTooltip(props.label);
  } catch {
    failed.value = true;
  }
});

onBeforeUnmount(() => map?.remove());
</script>

<template>
  <div class="office-map">
    <div
      v-if="!failed"
      ref="container"
      class="office-map__canvas"
      role="img"
      :aria-label="`موقعیت ${label} روی نقشه`"
    />
    <a
      class="contact-line link"
      :href="`https://neshan.org/maps/@${lat},${lng},16z,0p`"
      target="_blank"
      rel="noopener noreferrer"
    >
      <q-icon name="directions" />مسیریابی در نشان
    </a>
  </div>
</template>
