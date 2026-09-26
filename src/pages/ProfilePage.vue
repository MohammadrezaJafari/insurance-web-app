<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api';
import { useDirectoryStore } from '../stores/directory';
import { actorTypes, faDate, faMoneyShort, faNumber, itemKinds, socialNetworks } from '../format';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import ReportErrorDialog from '../components/ReportErrorDialog.vue';
import OfficeMap from '../components/OfficeMap.vue';
import ProfileTrust from '../components/ProfileTrust.vue';
import ComplaintDialog from '../components/ComplaintDialog.vue';

defineOptions({
  preFetch({ store, currentRoute, ssrContext }) {
    const directory = useDirectoryStore(store);
    return Promise.all([
      directory.loadProfile(
        String(currentRoute.params.slug),
        typeof currentRoute.query.ref === 'string' ? currentRoute.query.ref : undefined,
      ),
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
const complaining = ref(false);
const canInquire = computed(
  () => actor.value?.claimed && actor.value.type !== 'insurer' && actor.value.license_verified,
);
const type = computed(() => (actor.value ? actorTypes[actor.value.type] : null));
const hasCompanyFacts = computed(
  () =>
    actor.value?.type === 'insurer' &&
    Boolean(
      actor.value.market ||
      actor.value.official_network_size ||
      actor.value.established_year ||
      actor.value.stock_symbol,
    ),
);
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
  // Remember the referral channel so a direct inquiry made after this visit is attributed to it.
  if (typeof route.query.ref === 'string') {
    try {
      sessionStorage.setItem('insurehub_ref', route.query.ref);
    } catch {
      // Storage may be unavailable; attribution is best-effort.
    }
  }
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
          <router-link
            v-if="canInquire"
            :to="{ path: '/requests/new', query: { provider: actor.slug } }"
            class="btn btn--amber"
          >
            <q-icon name="request_quote" size="18px" />استعلام مستقیم
          </router-link>
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

          <section v-if="hasCompanyFacts" class="card">
            <h2><q-icon name="insights" />کارنامهٔ شرکت</h2>
            <div v-if="actor.market" class="report-card">
              <div class="kpi">
                <span>حق بیمهٔ تولیدی {{ faNumber(actor.market.year) }}</span>
                <b>{{ faMoneyShort(actor.market.premium) || '—' }}</b>
              </div>
              <div class="kpi">
                <span>خسارت پرداختی {{ faNumber(actor.market.year) }}</span>
                <b>{{ faMoneyShort(actor.market.claims) || '—' }}</b>
              </div>
              <div class="kpi">
                <span>ضریب خسارت</span>
                <b>{{
                  actor.market.loss_ratio !== null ? `٪${faNumber(actor.market.loss_ratio)}` : '—'
                }}</b>
              </div>
              <div class="kpi">
                <span>سهم بازار</span>
                <b>{{
                  actor.market.market_share !== null
                    ? `٪${faNumber(Math.round(actor.market.market_share * 10) / 10)}`
                    : '—'
                }}</b>
                <small v-if="actor.market.premium_rank"
                  >رتبهٔ {{ faNumber(actor.market.premium_rank) }} از
                  {{ faNumber(actor.market.insurers_ranked) }}</small
                >
              </div>
              <div
                v-if="actor.market.solvency_level || actor.market.solvency_ratio !== null"
                class="kpi"
              >
                <span>توانگری مالی {{ faNumber(actor.market.solvency_year ?? '') }}</span>
                <b>{{
                  actor.market.solvency_level ?? `٪${faNumber(actor.market.solvency_ratio ?? 0)}`
                }}</b>
              </div>
              <div v-if="actor.official_network_size" class="kpi">
                <span>نمایندهٔ فعال در فهرست رسمی</span>
                <b>{{ faNumber(actor.official_network_size) }}</b>
              </div>
            </div>
            <div v-else-if="actor.official_network_size" class="report-card">
              <div class="kpi">
                <span>نمایندهٔ فعال در فهرست رسمی</span>
                <b>{{ faNumber(actor.official_network_size) }}</b>
              </div>
            </div>
            <div v-if="actor.established_year" class="kv">
              <b>سال تأسیس</b><span>{{ faNumber(String(actor.established_year)) }}</span>
            </div>
            <div v-if="actor.stock_symbol" class="kv">
              <b>نماد بورسی</b><span>{{ actor.stock_symbol }}</span>
            </div>
            <table v-if="actor.market?.lines.length" class="line-table">
              <thead>
                <tr>
                  <th>رشته</th>
                  <th>حق بیمه</th>
                  <th>خسارت</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in actor.market.lines" :key="row.line">
                  <td>{{ row.line }}</td>
                  <td>{{ faMoneyShort(row.premium) || '—' }}</td>
                  <td>{{ faMoneyShort(row.claims) || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <p v-if="actor.market" class="card__note">
              منبع:
              <template v-for="(source, index) in actor.market.sources" :key="source.name">
                <template v-if="index">، </template>
                <a
                  v-if="source.url"
                  :href="source.url"
                  class="link"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ source.name }}</a
                >
                <span v-else>{{ source.name }}</span>
              </template>
            </p>
          </section>

          <section v-if="actor.services?.length" class="card">
            <h2>
              <q-icon name="volunteer_activism" />خدمات<span class="self-reported"
                >اظهار صاحب پروفایل</span
              >
            </h2>
            <div class="chips">
              <span v-for="service in actor.services" :key="service" class="chip">
                <q-icon name="check" size="14px" />{{ service }}
              </span>
            </div>
          </section>

          <section v-if="actor.items?.length" class="card">
            <h2>
              <q-icon name="work_history" />پروژه‌ها، دستاوردها و محتوا<span class="self-reported"
                >اظهار صاحب پروفایل</span
              >
            </h2>
            <div v-for="item in actor.items" :key="item.id" class="showcase-item">
              <span class="tile tile--sm tone-teal"
                ><q-icon :name="itemKinds[item.kind]?.icon"
              /></span>
              <div>
                <b>{{ item.title }}</b>
                <small class="muted-text">
                  {{ itemKinds[item.kind]?.label }}
                  <template v-if="item.year"> · {{ faNumber(String(item.year)) }}</template>
                  <template v-if="item.insurance_line"> · {{ item.insurance_line }}</template>
                </small>
                <p v-if="item.body" class="pre" style="margin: 4px 0 0">{{ item.body }}</p>
                <a
                  v-if="item.url"
                  :href="item.url"
                  class="link"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  >مشاهده</a
                >
              </div>
            </div>
          </section>

          <section v-if="actor.offers?.length" class="card">
            <h2><q-icon name="campaign" />پیشنهادهای ویژه</h2>
            <router-link
              v-for="offer in actor.offers"
              :key="offer.id"
              :to="`/offers/${offer.id}`"
              class="review-item"
            >
              <div>
                {{ offer.title }}
                <small>
                  <template v-if="offer.discount_text">{{ offer.discount_text }} · </template>
                  {{ offer.services.slice(0, 2).join('، ') }}
                </small>
              </div>
              <q-icon name="chevron_left" />
            </router-link>
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
            <div v-if="actor.office_address" class="contact-line">
              <q-icon name="place" /><span>{{ actor.office_address }}</span>
            </div>
            <OfficeMap
              v-if="actor.location"
              :lat="actor.location.lat"
              :lng="actor.location.lng"
              :label="actor.name"
            />
            <p v-if="!actor.website && !actor.public_phone && !actor.office_address">
              راه ارتباطی عمومی ثبت نشده است.
            </p>
            <div
              v-if="actor.social_links && Object.keys(actor.social_links).length"
              class="social-links"
            >
              <a
                v-for="(url, network) in actor.social_links"
                :key="network"
                :href="url"
                class="chip"
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                <q-icon :name="socialNetworks[network]?.icon ?? 'link'" size="14px" />
                {{ socialNetworks[network]?.label ?? network }}
              </a>
            </div>
            <router-link
              v-if="actor.claimed"
              :to="`/profiles/${actor.slug}/card`"
              class="link"
              style="display: block; margin-top: 10px"
            >
              <q-icon name="qr_code_2" /> کارت ویزیت دیجیتال
            </router-link>
          </section>

          <ProfileTrust v-if="actor.score" :score="actor.score" :reviews="actor.reviews ?? []" />

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

      <p v-if="actor.claimed" class="muted-text" style="text-align: center; margin: 0 0 32px">
        از خدمات این ارائه‌دهنده ناراضی هستید؟
        <button class="link-button" @click="complaining = true">ثبت شکایت</button>
      </p>
      <ComplaintDialog
        v-model="complaining"
        :slug="actor.slug"
        :name="actor.name"
        :categories="directory.taxonomy?.complaint_categories ?? []"
      />
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
