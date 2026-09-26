<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, insurerDashboard } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { actorTypes, faDateTime, faNumber, invitationStatuses } from '../format';
import type { InsurerDashboard } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import StatusBadge from '../components/StatusBadge.vue';
import InsurerNav from '../components/InsurerNav.vue';
import InsurerSalesPanel from '../components/InsurerSalesPanel.vue';

useMeta({
  title: 'داشبورد شبکه فروش | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const data = ref<InsurerDashboard | null>(null);
const error = ref('');
const route = useRoute();
const router = useRouter();
const slug = ref(String(route.query.insurer ?? ''));

function percent(value: number | null): string {
  return value === null ? '—' : `${faNumber(value)}٪`;
}
function hours(value: number | null): string {
  return value === null ? '—' : `${value.toLocaleString('fa-IR')} ساعت`;
}
async function load(): Promise<void> {
  error.value = '';
  try {
    data.value = await insurerDashboard(slug.value || undefined);
    if (slug.value && slug.value !== route.query.insurer) {
      void router.replace({ query: { ...route.query, insurer: slug.value } });
    }
    slug.value = data.value.insurer.slug;
  } catch (exception) {
    error.value = exception instanceof ApiError ? exception.message : 'دریافت داشبورد ممکن نشد.';
  }
}

onMounted(async () => {
  if (await requireAuth()) await load();
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">شرکت بیمه</div>
        <h1>داشبورد شرکت بیمه{{ data ? ` · ${data.insurer.name}` : '' }}</h1>
      </div>
      <select
        v-if="data && data.insurers.length > 1"
        v-model="slug"
        class="select"
        style="width: auto; margin: 0"
        aria-label="شرکت بیمه"
        @change="load"
      >
        <option v-for="item in data.insurers" :key="item.slug" :value="item.slug">
          {{ item.name }}
        </option>
      </select>
    </div>
    <InsurerNav />
    <p class="muted-text" style="margin-top: -8px">
      فقط فعالیت نمایندگان با وابستگی بررسی‌شده و فعال به این شرکت در
      {{ faNumber(data?.period_days ?? 90) }} روز اخیر. هویت درخواست‌کننده، متن درخواست، مدارک و
      محتوای پیشنهادها در این بخش نمایش داده نمی‌شود.
    </p>

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!data" class="skeleton" style="height: 320px" />

    <template v-else>
      <InsurerSalesPanel :insurer="data.insurer.slug" />
      <h2 class="section-title" style="margin-top: 28px">
        پاسخ‌گویی شبکه به استعلام‌های اینشورهاب
      </h2>
      <div class="kpi-row">
        <div class="kpi">
          <span>دعوت دریافتی شبکه</span><b>{{ faNumber(data.totals.invitations) }}</b>
        </div>
        <div class="kpi">
          <span>نرخ پاسخ</span><b>{{ percent(data.totals.response_rate) }}</b>
        </div>
        <div class="kpi">
          <span>میانه زمان پاسخ</span><b>{{ hours(data.totals.median_response_hours) }}</b>
        </div>
        <div class="kpi">
          <span>پیشنهاد / انتخاب‌شده</span>
          <b>{{ faNumber(data.totals.proposals) }} / {{ faNumber(data.totals.selected) }}</b>
        </div>
      </div>

      <div class="profile-grid">
        <div>
          <section class="card">
            <h2><q-icon name="groups" />کیفیت پاسخ نمایندگان</h2>
            <p v-if="!data.agents.length" class="muted-text">
              هنوز وابستگی بررسی‌شده‌ای برای این شرکت ثبت نشده است.
            </p>
            <div v-else class="compare-scroll">
              <table class="compare data-table">
                <thead>
                  <tr>
                    <th scope="col">نماینده</th>
                    <th scope="col">دعوت</th>
                    <th scope="col">نرخ پاسخ</th>
                    <th scope="col">میانه پاسخ</th>
                    <th scope="col">پیشنهاد</th>
                    <th scope="col">انتخاب</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="agent in data.agents" :key="agent.slug">
                    <td>
                      <router-link :to="`/profiles/${agent.slug}`" class="link">{{
                        agent.name
                      }}</router-link>
                      <small class="muted-text" style="display: block">
                        {{ actorTypes[agent.type].label
                        }}<template v-if="agent.province"> · {{ agent.province }}</template>
                      </small>
                    </td>
                    <td>{{ faNumber(agent.invitations) }}</td>
                    <td>{{ percent(agent.response_rate) }}</td>
                    <td>{{ hours(agent.median_response_hours) }}</td>
                    <td>{{ faNumber(agent.proposals) }}</td>
                    <td>{{ faNumber(agent.selected) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="card">
            <h2><q-icon name="list_alt" />فرصت‌های اخیر شبکه</h2>
            <p v-if="!data.recent.length" class="muted-text">فرصتی در این بازه ثبت نشده است.</p>
            <div v-for="(item, index) in data.recent" :key="index" class="review-item">
              <div>
                {{ item.agent }} · {{ item.insurance_line }} · {{ item.province }}
                <small>
                  {{ faDateTime(item.invited_at) }}
                  <template v-if="item.response_hours !== null">
                    · پاسخ در {{ hours(item.response_hours) }}</template
                  >
                </small>
              </div>
              <StatusBadge
                :status="
                  item.proposal_status === 'selected'
                    ? { label: 'انتخاب شد', tone: 'verified' }
                    : invitationStatuses[item.status]
                "
              />
            </div>
          </section>
        </div>

        <aside>
          <section class="card">
            <h2><q-icon name="category" />تفکیک رشته</h2>
            <p v-if="!data.by_line.length" class="muted-text">داده‌ای نیست.</p>
            <div v-for="line in data.by_line" :key="line.line" class="kv">
              <b>{{ line.line }}</b>
              <span
                >{{ faNumber(line.invitations) }} دعوت ·
                {{ faNumber(line.proposals) }} پیشنهاد</span
              >
            </div>
          </section>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
