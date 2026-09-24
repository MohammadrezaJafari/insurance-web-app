<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api';
import { useDirectoryStore } from '../stores/directory';
import { actorTypes, faDate } from '../format';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import ReportErrorDialog from '../components/ReportErrorDialog.vue';

defineOptions({
  preFetch({ store, currentRoute, ssrContext }) {
    const directory = useDirectoryStore(store);
    return Promise.all([
      directory.loadProfile(String(currentRoute.params.slug)),
      directory.loadTaxonomy(),
    ]).then(
      () => undefined,
      (exception: unknown) => {
        // Let the SSR render middleware answer crawlers with a real 404.
        if (ssrContext && exception instanceof ApiError && exception.status === 404) {
          (ssrContext as { statusCode?: number }).statusCode = 404;
        }
      },
    );
  },
});

const route = useRoute();
const router = useRouter();
const directory = useDirectoryStore();
const actor = computed(() =>
  directory.profileSlug === String(route.params.slug) ? directory.profile : null,
);
const loading = ref(false);
const error = ref('');
const reporting = ref(false);
const type = computed(() => (actor.value ? actorTypes[actor.value.type] : null));
const ownerSupplied = (field: string): boolean =>
  actor.value?.owner_supplied_fields.includes(field) ?? false;

useMeta(() => ({
  title: actor.value
    ? `${actor.value.name} | ${type.value?.label} | اینشورهاب`
    : 'پروفایل | اینشورهاب',
  meta: {
    description: {
      name: 'description',
      content:
        actor.value?.description?.slice(0, 160) ||
        `${actor.value?.name ?? 'پروفایل'} در اینشورهاب؛ مجوز، تخصص و منبع اطلاعات.`,
    },
    robots: {
      name: 'robots',
      content: actor.value?.indexable ? 'index, follow' : 'noindex, follow',
    },
  },
}));

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    await Promise.all([directory.loadProfile(String(route.params.slug)), directory.loadTaxonomy()]);
  } catch {
    error.value = 'این پروفایل پیدا نشد یا هنوز منتشر نشده است.';
  } finally {
    loading.value = false;
  }
}
function claim(): void {
  void router.push({ path: '/account', query: { claim: String(route.params.slug) } });
}

watch(
  () => route.params.slug,
  () => void load(),
);
onMounted(() => {
  if (!actor.value) void load();
});
</script>

<template>
  <SiteHeader />
  <main class="container">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/">اینشورهاب</router-link>
      <q-icon name="chevron_left" />
      <router-link v-if="actor" :to="{ path: '/search', query: { type: actor.type } }">{{
        type?.plural
      }}</router-link>
      <router-link v-else to="/search">جست‌وجو</router-link>
    </nav>

    <div v-if="loading && !actor" class="skeleton" style="height: 180px; margin-top: 14px" />
    <div v-else-if="error || !actor" class="state state--error" style="margin: 14px 0 72px">
      <q-icon name="error_outline" />
      {{ error || 'این پروفایل پیدا نشد یا هنوز منتشر نشده است.' }}
    </div>

    <template v-else>
      <header class="profile-head">
        <span class="tile tile--lg" :class="`tone-${type?.tone}`"
          ><q-icon :name="type?.icon"
        /></span>
        <div class="profile-head__body">
          <h1>{{ actor.name }}</h1>
          <div class="profile-head__meta">
            {{ type?.label }}
            <template v-if="actor.province">
              · {{ actor.province
              }}<template v-if="actor.city && actor.city !== actor.province"
                >، {{ actor.city }}</template
              ></template
            >
          </div>
          <div class="profile-head__badges">
            <span v-if="actor.license_verified" class="badge badge--verified">
              <q-icon name="verified" size="16px" />مجوز حرفه‌ای بررسی‌شده
            </span>
            <span v-if="actor.identity_verified" class="badge badge--brand">
              <q-icon name="how_to_reg" size="16px" />صاحب پروفایل تأییدشده
            </span>
            <span
              v-if="!actor.license_verified && !actor.identity_verified"
              class="badge badge--neutral"
            >
              <q-icon name="info" size="16px" />هنوز نشان بررسی ندارد
            </span>
            <router-link to="/verification" class="badge badge--neutral">معنای نشان‌ها</router-link>
          </div>
        </div>
        <div class="profile-head__actions">
          <a
            v-if="actor.website"
            :href="actor.website"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn--primary"
          >
            <q-icon name="language" size="18px" />وب‌سایت
          </a>
          <button class="btn btn--outline" @click="reporting = true">
            <q-icon name="flag" size="18px" />گزارش خطا
          </button>
        </div>
      </header>

      <div class="profile-grid">
        <div>
          <section class="card">
            <h2>
              <q-icon name="notes" />معرفی<span
                v-if="ownerSupplied('description')"
                class="self-reported"
                >اظهار صاحب پروفایل</span
              >
            </h2>
            <p>{{ actor.description || 'توضیحات این پروفایل هنوز تکمیل نشده است.' }}</p>
          </section>

          <section class="card">
            <h2><q-icon name="category" />حوزهٔ فعالیت</h2>
            <div class="kv">
              <b>رشته‌های بیمه</b>
              <div class="chips">
                <router-link
                  v-for="line in actor.insurance_lines"
                  :key="line"
                  :to="{ path: '/search', query: { line } }"
                  class="chip"
                  >{{ line }}</router-link
                >
                <span v-if="!actor.insurance_lines.length">ثبت نشده</span>
              </div>
            </div>
            <div class="kv">
              <b
                >تخصص‌ها<span v-if="ownerSupplied('specialties')" class="self-reported"
                  >اظهاری</span
                ></b
              >
              <div class="chips">
                <span v-for="specialty in actor.specialties" :key="specialty" class="chip">{{
                  specialty
                }}</span>
                <span v-if="!actor.specialties.length">ثبت نشده</span>
              </div>
            </div>
            <div v-if="actor.province" class="kv">
              <b>موقعیت<span v-if="ownerSupplied('city')" class="self-reported">اظهاری</span></b>
              <span
                >{{ actor.province
                }}<template v-if="actor.city && actor.city !== actor.province"
                  >، {{ actor.city }}</template
                ></span
              >
            </div>
          </section>

          <section class="card">
            <h2><q-icon name="workspace_premium" />مجوز و وابستگی</h2>
            <p v-if="!actor.licenses.length && !actor.affiliations?.length">
              مجوز یا وابستگی بررسی‌شده‌ای برای نمایش ثبت نشده است.
            </p>
            <div v-for="license in actor.licenses" :key="license.number" class="kv">
              <b>{{ license.type }}</b>
              <div>
                شماره {{ license.number
                }}<template v-if="license.authority"> · {{ license.authority }}</template>
                <small style="display: block; color: var(--muted)">
                  بررسی: {{ faDate(license.verified_at)
                  }}<template v-if="license.valid_until">
                    · اعتبار تا {{ faDate(license.valid_until) }}</template
                  >
                </small>
              </div>
            </div>
            <div
              v-for="affiliation in actor.affiliations"
              :key="affiliation.insurer_name + affiliation.role"
              class="kv"
            >
              <b>{{ affiliation.role }}</b>
              <div>
                <router-link
                  v-if="affiliation.insurer_slug"
                  class="link"
                  :to="`/profiles/${affiliation.insurer_slug}`"
                  >{{ affiliation.insurer_name }}</router-link
                >
                <span v-else>{{ affiliation.insurer_name }}</span>
                <small style="display: block; color: var(--muted)"
                  >وابستگی بررسی‌شده در {{ faDate(affiliation.verified_at) }}</small
                >
              </div>
            </div>
          </section>

          <section v-if="actor.network?.length" class="card">
            <h2><q-icon name="hub" />شبکهٔ فروش بررسی‌شده</h2>
            <div class="network-list">
              <router-link
                v-for="member in actor.network"
                :key="member.slug"
                :to="`/profiles/${member.slug}`"
                class="network-item"
              >
                <span class="tile tile--sm" :class="`tone-${actorTypes[member.type].tone}`"
                  ><q-icon :name="actorTypes[member.type].icon"
                /></span>
                <div>
                  {{ member.name }}
                  <small
                    >{{ member.role
                    }}<template v-if="member.province"> · {{ member.province }}</template></small
                  >
                </div>
              </router-link>
            </div>
          </section>
        </div>

        <aside>
          <section class="card">
            <h2><q-icon name="contact_phone" />ارتباط</h2>
            <a
              v-if="actor.website"
              class="contact-line link"
              :href="actor.website"
              target="_blank"
              rel="noopener noreferrer"
            >
              <q-icon name="language" />وب‌سایت رسمی
              <span v-if="ownerSupplied('website')" class="self-reported">اظهاری</span>
            </a>
            <a
              v-if="actor.public_phone"
              class="contact-line link"
              :href="`tel:${actor.public_phone}`"
            >
              <q-icon name="call" /><span dir="ltr">{{ actor.public_phone }}</span>
              <span v-if="ownerSupplied('public_phone')" class="self-reported">اظهاری</span>
            </a>
            <p v-if="!actor.website && !actor.public_phone">راه ارتباطی عمومی ثبت نشده است.</p>
          </section>

          <section class="card">
            <h2><q-icon name="source" />منبع اطلاعات</h2>
            <div
              v-for="source in actor.sources"
              :key="source.name + source.observed_at"
              class="source"
            >
              <a
                v-if="source.url"
                class="link"
                :href="source.url"
                target="_blank"
                rel="noopener noreferrer"
                >{{ source.name }}</a
              >
              <span v-else>{{ source.name }}</span>
              <small>دریافت: {{ faDate(source.observed_at) }}</small>
            </div>
            <p class="card__note">
              آخرین بررسی: {{ faDate(actor.last_reviewed_at) }}. بخش‌های «اظهاری» را صاحب پروفایل
              تکمیل کرده و پس از بازبینی منتشر شده‌اند.
            </p>
          </section>

          <div v-if="!actor.claimed" class="claim-box">
            <b>این پروفایل متعلق به شماست؟</b>
            با مطالبهٔ پروفایل، پس از بررسی مدارک می‌توانید معرفی، تخصص و راه ارتباطی را تکمیل کنید.
            <button class="btn btn--amber btn--block" @click="claim">مطالبهٔ پروفایل</button>
          </div>
        </aside>
      </div>

      <ReportErrorDialog
        v-model="reporting"
        :slug="actor.slug"
        :fields="directory.taxonomy?.error_report_fields ?? []"
        :relations="directory.taxonomy?.removal_relations ?? []"
      />
    </template>
  </main>
  <SiteFooter />
</template>
