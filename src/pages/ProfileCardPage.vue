<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute } from 'vue-router';
import qrcode from 'qrcode-generator';
import { useDirectoryStore } from '../stores/directory';
import { actorTypes, referralChannels } from '../format';

useMeta({
  title: 'کارت ویزیت دیجیتال | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const route = useRoute();
const directory = useDirectoryStore();
const slug = String(route.params.slug);
const actor = computed(() => (directory.profileSlug === slug ? directory.profile : null));
const origin = ref('');
const copied = ref('');
const error = ref('');

const profileUrl = (channel: string) => `${origin.value}/profiles/${slug}?ref=${channel}`;
const qrSvg = computed(() => {
  if (!origin.value) return '';
  const code = qrcode(0, 'M');
  code.addData(profileUrl('card'));
  code.make();
  return code.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
});

/** vCard 3.0 with the public details only. */
function downloadVcard(): void {
  if (!actor.value) return;
  const escape = (value: string) => value.replace(/([,;\\])/g, '\\$1');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escape(actor.value.name)}`,
    `ORG:${escape(actor.value.name)}`,
    `TITLE:${actorTypes[actor.value.type].label}`,
    actor.value.public_phone ? `TEL;TYPE=WORK:${actor.value.public_phone}` : '',
    `URL:${profileUrl('card')}`,
    actor.value.website ? `URL:${actor.value.website}` : '',
    actor.value.office_address ? `ADR;TYPE=WORK:;;${escape(actor.value.office_address)};;;;` : '',
    'END:VCARD',
  ].filter(Boolean);
  const url = URL.createObjectURL(
    new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' }),
  );
  Object.assign(document.createElement('a'), { href: url, download: `${slug}.vcf` }).click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
async function copy(channel: string): Promise<void> {
  await navigator.clipboard.writeText(profileUrl(channel)).catch(() => undefined);
  copied.value = channel;
  setTimeout(() => (copied.value = ''), 2000);
}

onMounted(async () => {
  origin.value = window.location.origin;
  try {
    await directory.loadProfile(slug);
  } catch {
    error.value = 'پروفایل پیدا نشد.';
  }
});
</script>

<template>
  <main class="container flow-page card-page">
    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!actor" class="skeleton" style="height: 320px" />
    <template v-else>
      <article class="business-card">
        <div>
          <span class="tile tile--lg" :class="`tone-${actorTypes[actor.type].tone}`">
            <q-icon :name="actorTypes[actor.type].icon" />
          </span>
          <h1>{{ actor.name }}</h1>
          <p>
            {{ actorTypes[actor.type].label }}
            <template v-if="actor.province"> · {{ actor.province }}</template>
          </p>
          <p v-if="actor.public_phone" dir="ltr" style="text-align: end">
            {{ actor.public_phone }}
          </p>
          <div class="chips">
            <span v-if="actor.license_verified" class="badge badge--verified">
              <q-icon name="verified" size="14px" />مجوز بررسی‌شده
            </span>
            <span v-for="line in actor.insurance_lines.slice(0, 4)" :key="line" class="chip">{{
              line
            }}</span>
          </div>
        </div>
        <!-- eslint-disable-next-line vue/no-v-html -- SVG generated locally from our own URL -->
        <div class="business-card__qr" aria-label="کد QR پروفایل" role="img" v-html="qrSvg" />
      </article>

      <div class="stack-row no-print" style="justify-content: center; margin: 16px 0">
        <button class="btn btn--primary" @click="downloadVcard">
          <q-icon name="contact_page" size="18px" />ذخیره در مخاطبان (vCard)
        </button>
        <button class="btn btn--outline" onclick="window.print()">
          <q-icon name="print" size="18px" />چاپ کارت
        </button>
        <router-link :to="`/profiles/${slug}`" class="btn btn--ghost">مشاهدهٔ پروفایل</router-link>
      </div>

      <section class="card no-print">
        <h2><q-icon name="share" />پیوند اشتراک برای هر کانال</h2>
        <p class="muted-text">
          برای هر کانال پیوند جدا بگذارید تا در «پیشخوان» ببینید بازدید پروفایلتان از کدام کانال
          آمده است.
        </p>
        <div v-for="(label, channel) in referralChannels" :key="channel" class="kv">
          <b>{{ label }}</b>
          <button class="link-button" dir="ltr" @click="copy(channel)">
            {{ copied === channel ? 'کپی شد ✓' : profileUrl(channel) }}
          </button>
        </div>
      </section>
    </template>
  </main>
</template>
